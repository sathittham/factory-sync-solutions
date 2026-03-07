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
	GetByRegID(ctx context.Context, regID string) (*Profile, error)
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
