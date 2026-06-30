// backfill-projects creates projects/{companyRegId} documents from existing user profiles.
//
// Run from apps/backend:
//
//	ENVIRONMENT=development go run ./cmd/backfill-projects
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/sathittham/factory-sync-solutions/apps/backend/services/profile"
)

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

func main() {
	limit := flag.Int("limit", 500, "maximum users to scan")
	dryRun := flag.Bool("dry-run", false, "print planned changes without writing")
	flag.Parse()

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}
	if err := godotenv.Load(".env." + env); err != nil {
		log.Printf("no .env.%s found, relying on existing env vars", env)
	}

	ctx := context.Background()
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}
	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("firestore init: %v", err)
	}
	defer client.Close()

	query := client.Collection("users").OrderBy("createdAt", firestore.Desc)
	if *limit > 0 {
		query = query.Limit(*limit)
	}

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		log.Fatalf("list users: %v", err)
	}

	changed := 0
	skipped := 0
	for _, doc := range docs {
		var p profile.Profile
		if err := doc.DataTo(&p); err != nil {
			log.Printf("skip %s: decode profile: %v", doc.Ref.ID, err)
			skipped++
			continue
		}
		p.UID = doc.Ref.ID
		if p.CompanyRegID == "" {
			log.Printf("skip %s: missing companyRegId", p.UID)
			skipped++
			continue
		}
		if p.CreatedAt == "" {
			p.CreatedAt = time.Now().UTC().Format(time.RFC3339)
		}
		if p.UpdatedAt == "" {
			p.UpdatedAt = p.CreatedAt
		}

		if *dryRun {
			fmt.Printf("would backfill project %s for user %s\n", p.CompanyRegID, p.UID)
			changed++
			continue
		}

		if err := backfillUser(ctx, client, &p); err != nil {
			log.Printf("skip %s: %v", p.UID, err)
			skipped++
			continue
		}
		fmt.Printf("backfilled project %s for user %s\n", p.CompanyRegID, p.UID)
		changed++
	}

	fmt.Printf("done: changed=%d skipped=%d\n", changed, skipped)
}

func backfillUser(ctx context.Context, client *firestore.Client, p *profile.Profile) error {
	userRef := client.Collection("users").Doc(p.UID)
	projectRef := client.Collection("projects").Doc(p.CompanyRegID)
	memberRef := projectRef.Collection("members").Doc(p.UID)
	projectRole := projectRoleForProfile(p.Role)
	now := time.Now().UTC().Format(time.RFC3339)

	return client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		projectSnap, err := tx.Get(projectRef)
		projectExists := err == nil
		if err != nil && status.Code(err) != codes.NotFound {
			return fmt.Errorf("get project: %w", err)
		}

		memberSnap, err := tx.Get(memberRef)
		memberExists := err == nil && memberSnap.Exists()
		if err != nil && status.Code(err) != codes.NotFound {
			return fmt.Errorf("get member: %w", err)
		}

		if projectExists {
			updates := projectUpdates(projectSnap, p, now)
			if !memberExists {
				updates = append(updates, firestore.Update{Path: "memberCount", Value: firestore.Increment(1)})
			}
			if len(updates) > 0 {
				if err := tx.Update(projectRef, updates); err != nil {
					return fmt.Errorf("update project: %w", err)
				}
			}
		} else {
			if err := tx.Set(projectRef, projectFromProfile(p, now)); err != nil {
				return fmt.Errorf("set project: %w", err)
			}
		}

		if !memberExists {
			if err := tx.Set(memberRef, memberFromProfile(p, projectRole)); err != nil {
				return fmt.Errorf("set member: %w", err)
			}
		}

		updates := []firestore.Update{
			{Path: fmt.Sprintf("projectRoles.%s", p.CompanyRegID), Value: projectRole},
			{Path: "updatedAt", Value: now},
		}
		if p.Role == "" || p.Role == "user" {
			updates = append(updates, firestore.Update{Path: "role", Value: "owner"})
		}
		if err := tx.Update(userRef, updates); err != nil {
			return fmt.Errorf("update user project role: %w", err)
		}
		return nil
	})
}

func projectRoleForProfile(role string) string {
	switch role {
	case "", "user", "owner":
		return "owner"
	case "system_admin", "manager":
		return role
	case "admin":
		return "system_admin"
	default:
		return "general_user"
	}
}

func projectFromProfile(p *profile.Profile, now string) projectDocument {
	ownerUID := ""
	if projectRoleForProfile(p.Role) == "owner" {
		ownerUID = p.UID
	}
	return projectDocument{
		ProjectID:    p.CompanyRegID,
		Name:         p.CompanyName,
		CompanyRegID: p.CompanyRegID,
		IndustryType: p.IndustryType,
		CompanySize:  p.CompanySize,
		OwnerUID:     ownerUID,
		MemberCount:  1,
		IsActive:     true,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    now,
	}
}

func memberFromProfile(p *profile.Profile, projectRole string) memberDocument {
	return memberDocument{
		UID:         p.UID,
		Email:       p.Email,
		DisplayName: p.DisplayName,
		ProjectRole: projectRole,
		JoinMethod:  "backfill",
		JoinedAt:    p.CreatedAt,
		IsActive:    true,
	}
}

func projectUpdates(snap *firestore.DocumentSnapshot, p *profile.Profile, now string) []firestore.Update {
	var existing projectDocument
	if err := snap.DataTo(&existing); err != nil {
		return []firestore.Update{{Path: "updatedAt", Value: now}}
	}

	updates := []firestore.Update{{Path: "updatedAt", Value: now}}
	if existing.ProjectID == "" {
		updates = append(updates, firestore.Update{Path: "projectID", Value: p.CompanyRegID})
	}
	if existing.Name == "" {
		updates = append(updates, firestore.Update{Path: "name", Value: p.CompanyName})
	}
	if existing.CompanyRegID == "" {
		updates = append(updates, firestore.Update{Path: "companyRegId", Value: p.CompanyRegID})
	}
	if existing.IndustryType == "" {
		updates = append(updates, firestore.Update{Path: "industryType", Value: p.IndustryType})
	}
	if existing.CompanySize == "" {
		updates = append(updates, firestore.Update{Path: "companySize", Value: p.CompanySize})
	}
	if existing.OwnerUID == "" && projectRoleForProfile(p.Role) == "owner" {
		updates = append(updates, firestore.Update{Path: "ownerUID", Value: p.UID})
	}
	if existing.CreatedAt == "" {
		updates = append(updates, firestore.Update{Path: "createdAt", Value: p.CreatedAt})
	}
	return updates
}
