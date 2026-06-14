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

type projectDocument struct {
	ProjectID    string `firestore:"projectID"`
	Name         string `firestore:"name"`
	CompanyRegID string `firestore:"companyRegId"`
	IndustryType string `firestore:"industryType"`
	CompanySize  string `firestore:"companySize"`
	OwnerUID     string `firestore:"ownerUID"`
	MemberCount  int    `firestore:"memberCount"`
	IsActive     bool   `firestore:"isActive"`
	CreatedAt    string `firestore:"createdAt"`
	UpdatedAt    string `firestore:"updatedAt"`
}

type memberDocument struct {
	UID         string `firestore:"uid"`
	Email       string `firestore:"email"`
	DisplayName string `firestore:"displayName"`
	ProjectRole string `firestore:"projectRole"`
	JoinMethod  string `firestore:"joinMethod"`
	JoinedAt    string `firestore:"joinedAt"`
	IsActive    bool   `firestore:"isActive"`
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
	userRef := r.client.Collection("users").Doc(profile.UID)
	projectRef := r.client.Collection("projects").Doc(profile.CompanyRegID)
	memberRef := projectRef.Collection("members").Doc(profile.UID)

	err := r.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		if _, err := tx.Get(userRef); err == nil {
			return ErrAlreadyRegistered
		} else if status.Code(err) != codes.NotFound {
			return fmt.Errorf("get user document: %w", err)
		}

		projectSnap, err := tx.Get(projectRef)
		projectExists := err == nil
		if err != nil && status.Code(err) != codes.NotFound {
			return fmt.Errorf("get project document: %w", err)
		}

		memberSnap, err := tx.Get(memberRef)
		memberExists := err == nil && memberSnap.Exists()
		if err != nil && status.Code(err) != codes.NotFound {
			return fmt.Errorf("get project member document: %w", err)
		}

		projectRole := projectRoleFromProfile(profile)
		if profile.ProjectRoles == nil {
			profile.ProjectRoles = map[string]string{}
		}
		profile.ProjectRoles[profile.CompanyRegID] = projectRole

		if err := tx.Set(userRef, profile); err != nil {
			return fmt.Errorf("set user document: %w", err)
		}

		if projectExists {
			updates := projectUpdatesFromProfile(projectSnap, profile)
			if !memberExists {
				updates = append(updates, firestore.Update{Path: "memberCount", Value: firestore.Increment(1)})
			}
			if len(updates) > 0 {
				if err := tx.Update(projectRef, updates); err != nil {
					return fmt.Errorf("update project document: %w", err)
				}
			}
		} else {
			if err := tx.Set(projectRef, projectFromProfile(profile)); err != nil {
				return fmt.Errorf("set project document: %w", err)
			}
		}

		if !memberExists {
			if err := tx.Set(memberRef, memberFromProfile(profile)); err != nil {
				return fmt.Errorf("set project member document: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("firestore create profile transaction: %w", err)
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

func projectFromProfile(profile *Profile) projectDocument {
	ownerUID := ""
	if projectRoleFromProfile(profile) == "owner" {
		ownerUID = profile.UID
	}
	return projectDocument{
		ProjectID:    profile.CompanyRegID,
		Name:         profile.CompanyName,
		CompanyRegID: profile.CompanyRegID,
		IndustryType: profile.IndustryType,
		CompanySize:  profile.CompanySize,
		OwnerUID:     ownerUID,
		MemberCount:  1,
		IsActive:     true,
		CreatedAt:    profile.CreatedAt,
		UpdatedAt:    profile.UpdatedAt,
	}
}

func memberFromProfile(profile *Profile) memberDocument {
	return memberDocument{
		UID:         profile.UID,
		Email:       profile.Email,
		DisplayName: profile.DisplayName,
		ProjectRole: projectRoleFromProfile(profile),
		JoinMethod:  "registration",
		JoinedAt:    profile.CreatedAt,
		IsActive:    true,
	}
}

func projectRoleFromProfile(profile *Profile) string {
	if profile.Role != "" {
		return profile.Role
	}
	return "owner"
}

func projectUpdatesFromProfile(snap *firestore.DocumentSnapshot, profile *Profile) []firestore.Update {
	var existing projectDocument
	if err := snap.DataTo(&existing); err != nil {
		return []firestore.Update{{Path: "updatedAt", Value: profile.UpdatedAt}}
	}

	updates := []firestore.Update{{Path: "updatedAt", Value: profile.UpdatedAt}}
	if existing.ProjectID == "" {
		updates = append(updates, firestore.Update{Path: "projectID", Value: profile.CompanyRegID})
	}
	if existing.Name == "" {
		updates = append(updates, firestore.Update{Path: "name", Value: profile.CompanyName})
	}
	if existing.CompanyRegID == "" {
		updates = append(updates, firestore.Update{Path: "companyRegId", Value: profile.CompanyRegID})
	}
	if existing.IndustryType == "" {
		updates = append(updates, firestore.Update{Path: "industryType", Value: profile.IndustryType})
	}
	if existing.CompanySize == "" {
		updates = append(updates, firestore.Update{Path: "companySize", Value: profile.CompanySize})
	}
	if existing.OwnerUID == "" && projectRoleFromProfile(profile) == "owner" {
		updates = append(updates, firestore.Update{Path: "ownerUID", Value: profile.UID})
	}
	if existing.CreatedAt == "" {
		updates = append(updates, firestore.Update{Path: "createdAt", Value: profile.CreatedAt})
	}
	return updates
}
