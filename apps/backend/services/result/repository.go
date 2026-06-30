package result

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// RepositoryInterface defines the assessment data access contract.
type RepositoryInterface interface {
	Create(ctx context.Context, assessment *Assessment) error
	GetByID(ctx context.Context, id string) (*Assessment, error)
	GetByUID(ctx context.Context, uid string) ([]Assessment, error)
	ListAll(ctx context.Context, filters map[string]string, limit int) ([]Assessment, error)
}

// Repository implements RepositoryInterface using Firestore.
type Repository struct {
	client *firestore.Client
}

func NewRepository(client *firestore.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) Create(ctx context.Context, assessment *Assessment) error {
	_, err := r.client.Collection("assessments").Doc(assessment.ID).Set(ctx, assessment)
	if err != nil {
		return fmt.Errorf("firestore set assessment: %w", err)
	}
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Assessment, error) {
	doc, err := r.client.Collection("assessments").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("firestore get assessment: %w", err)
	}

	var a Assessment
	if err := doc.DataTo(&a); err != nil {
		return nil, fmt.Errorf("unmarshal assessment: %w", err)
	}
	return &a, nil
}

func (r *Repository) GetByUID(ctx context.Context, uid string) ([]Assessment, error) {
	iter := r.client.Collection("assessments").
		Where("uid", "==", uid).
		OrderBy("submittedAt", firestore.Desc).
		Documents(ctx)
	defer iter.Stop()

	var results []Assessment
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("firestore iterate assessments: %w", err)
		}
		var a Assessment
		if err := doc.DataTo(&a); err != nil {
			return nil, fmt.Errorf("unmarshal assessment: %w", err)
		}
		results = append(results, a)
	}
	return results, nil
}

// assessmentFilterFields is the set of field names that exist on the
// assessment document and may be pushed down to Firestore as Where clauses.
var assessmentFilterFields = map[string]bool{
	"uid":    true,
	"quizId": true,
}

func (r *Repository) ListAll(ctx context.Context, filters map[string]string, limit int) ([]Assessment, error) {
	query := r.client.Collection("assessments").OrderBy("submittedAt", firestore.Desc)

	for key, val := range filters {
		if assessmentFilterFields[key] {
			query = query.Where(key, "==", val)
		}
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	var results []Assessment
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("firestore iterate all assessments: %w", err)
		}
		var a Assessment
		if err := doc.DataTo(&a); err != nil {
			return nil, fmt.Errorf("unmarshal assessment: %w", err)
		}
		results = append(results, a)
	}
	return results, nil
}
