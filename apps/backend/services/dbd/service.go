package dbd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"
)

var (
	ErrCompanyNotFound = errors.New("company not found")
	ErrDBDUnavailable  = errors.New("dbd api unavailable")
	ErrInvalidRegID    = errors.New("invalid registration id")
)

const dbdBaseURL = "https://openapi.dbd.go.th/api/v1/juristic_person"

// HTTPClient allows injecting a custom HTTP client for testing.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type cacheEntry struct {
	profile   *CompanyProfile
	expiresAt time.Time
}

type Service struct {
	client HTTPClient
	cache  map[string]cacheEntry
	mu     sync.RWMutex
}

func NewService(client HTTPClient) *Service {
	return &Service{
		client: client,
		cache:  make(map[string]cacheEntry),
	}
}

func NewDefaultService() *Service {
	return &Service{
		client: &http.Client{Timeout: 10 * time.Second},
		cache:  make(map[string]cacheEntry),
	}
}

func (s *Service) GetCompanyProfile(ctx context.Context, regID string) (*CompanyProfile, error) {
	if len(regID) != 13 {
		return nil, ErrInvalidRegID
	}

	// Check cache first
	s.mu.RLock()
	if entry, ok := s.cache[regID]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		return entry.profile, nil
	}
	s.mu.RUnlock()

	url := fmt.Sprintf("%s/%s", dbdBaseURL, regID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "FactoryHealthCheck/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("dbd request: %w", ErrDBDUnavailable)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dbd returned status %d: %w", resp.StatusCode, ErrDBDUnavailable)
	}

	var dbdResp DBDResponse
	if err := json.NewDecoder(resp.Body).Decode(&dbdResp); err != nil {
		return nil, fmt.Errorf("decode dbd response: %w", err)
	}

	if dbdResp.Status.Code != "1000" || len(dbdResp.Data) == 0 {
		return nil, ErrCompanyNotFound
	}

	profile := mapToCompanyProfile(&dbdResp.Data[0].JuristicPerson)

	// Cache for 1 hour
	s.mu.Lock()
	s.cache[regID] = cacheEntry{profile: profile, expiresAt: time.Now().Add(time.Hour)}
	s.mu.Unlock()

	return profile, nil
}

func mapToCompanyProfile(jp *DBDJuristicPerson) *CompanyProfile {
	p := &CompanyProfile{
		JuristicID:      jp.JuristicID,
		NameTH:          jp.NameTH,
		NameEN:          jp.NameEN,
		Type:            jp.Type,
		RegisterDate:    jp.RegisterDate,
		Status:          jp.Status,
		RegisterCapital: jp.RegisterCapital,
		BranchName:      jp.BranchName,
	}

	if jp.Objective != nil {
		p.ObjectiveCode = jp.Objective.Objective.Code
		p.ObjectiveTextTH = jp.Objective.Objective.TextTH
		p.ObjectiveTextEN = jp.Objective.Objective.TextEN
	}

	if jp.Address != nil {
		addr := &jp.Address.AddressType
		p.Address = addr.Address

		if addr.CitySubDivision != nil {
			p.SubDistrict = addr.CitySubDivision.TextTH
			if p.SubDistrict == "" {
				p.SubDistrict = addr.CitySubDivision.CityTextTH
			}
		}
		if addr.City != nil {
			p.District = addr.City.CityTextTH
			if p.District == "" {
				p.District = addr.City.TextTH
			}
		}
		if addr.CountrySubDiv != nil {
			p.Province = addr.CountrySubDiv.TextTH
		}
	}

	return p
}
