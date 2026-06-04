package profile

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// RepositoryInterface defines the profile data access contract.
type RepositoryInterface interface {
	GetByUID(ctx context.Context, uid string) (*Profile, error)
	GetByUIDs(ctx context.Context, uids []string) (map[string]*Profile, error)
	GetByRegID(ctx context.Context, regID string) (*Profile, error)
	ListAll(ctx context.Context, limit int) ([]*Profile, error)
	Create(ctx context.Context, profile *Profile) error
	Update(ctx context.Context, uid string, updates []firestore.Update) error
}

// Repository implements RepositoryInterface using Firestore.
type Repository struct {
	client *firestore.Client
}

func NewRepository(client *firestore.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) GetByUID(ctx context.Context, uid string) (*Profile, error) {
	doc, err := r.client.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("firestore get: %w", err)
	}

	var profile Profile
	if err := doc.DataTo(&profile); err != nil {
		return nil, fmt.Errorf("unmarshal profile: %w", err)
	}
	return &profile, nil
}

func (r *Repository) GetByUIDs(ctx context.Context, uids []string) (map[string]*Profile, error) {
	profiles := make(map[string]*Profile, len(uids))
	if len(uids) == 0 {
		return profiles, nil
	}

	// Firestore GetAll by document refs — no batch-size limit
	refs := make([]*firestore.DocumentRef, len(uids))
	for i, uid := range uids {
		refs[i] = r.client.Collection("users").Doc(uid)
	}

	docs, err := r.client.GetAll(ctx, refs)
	if err != nil {
		return nil, fmt.Errorf("firestore get all: %w", err)
	}

	for _, doc := range docs {
		if !doc.Exists() {
			continue
		}
		var p Profile
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		// Use document ID as key — more reliable than p.UID which may be empty
		// if the uid field wasn't stored in the document data.
		p.UID = doc.Ref.ID
		profiles[doc.Ref.ID] = &p
	}
	return profiles, nil
}

func (r *Repository) ListAll(ctx context.Context, limit int) ([]*Profile, error) {
	query := r.client.Collection("users").OrderBy("createdAt", firestore.Desc)
	if limit > 0 {
		query = query.Limit(limit)
	}
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("firestore list all: %w", err)
	}

	profiles := make([]*Profile, 0, len(docs))
	for _, doc := range docs {
		var p Profile
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.UID = doc.Ref.ID
		profiles = append(profiles, &p)
	}
	return profiles, nil
}

func (r *Repository) GetByRegID(ctx context.Context, regID string) (*Profile, error) {
	docs, err := r.client.Collection("users").Where("companyRegId", "==", regID).Limit(1).Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("firestore query: %w", err)
	}
	if len(docs) == 0 {
		return nil, nil
	}

	var profile Profile
	if err := docs[0].DataTo(&profile); err != nil {
		return nil, fmt.Errorf("unmarshal profile: %w", err)
	}
	return &profile, nil
}

func (r *Repository) Create(ctx context.Context, profile *Profile) error {
	_, err := r.client.Collection("users").Doc(profile.UID).Set(ctx, profile)
	if err != nil {
		return fmt.Errorf("firestore set: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, uid string, updates []firestore.Update) error {
	_, err := r.client.Collection("users").Doc(uid).Update(ctx, updates)
	if err != nil {
		return fmt.Errorf("firestore update: %w", err)
	}
	return nil
}
