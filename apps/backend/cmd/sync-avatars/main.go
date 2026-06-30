// sync-avatars copies Firebase Auth photo URLs into users/{uid}.avatarURL.
//
// Run from apps/backend:
//
//	ENVIRONMENT=development go run ./cmd/sync-avatars
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
	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/joho/godotenv"
)

type userProfile struct {
	UID       string `firestore:"uid"`
	AvatarURL string `firestore:"avatarURL"`
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
	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("firebase auth init: %v", err)
	}
	fsClient, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("firestore init: %v", err)
	}
	defer fsClient.Close()

	query := fsClient.Collection("users").OrderBy("createdAt", firestore.Desc)
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
		var profile userProfile
		if err := doc.DataTo(&profile); err != nil {
			log.Printf("skip %s: decode profile: %v", doc.Ref.ID, err)
			skipped++
			continue
		}
		profile.UID = doc.Ref.ID
		if profile.AvatarURL != "" {
			skipped++
			continue
		}

		user, err := authClient.GetUser(ctx, profile.UID)
		if err != nil {
			log.Printf("skip %s: get auth user: %v", profile.UID, err)
			skipped++
			continue
		}
		if user.PhotoURL == "" {
			skipped++
			continue
		}

		if *dryRun {
			fmt.Printf("would update avatarURL for %s\n", profile.UID)
			changed++
			continue
		}

		if err := updateAvatarURL(ctx, doc.Ref, user); err != nil {
			log.Printf("skip %s: update avatarURL: %v", profile.UID, err)
			skipped++
			continue
		}
		fmt.Printf("updated avatarURL for %s\n", profile.UID)
		changed++
	}

	fmt.Printf("done: changed=%d skipped=%d\n", changed, skipped)
}

func updateAvatarURL(ctx context.Context, ref *firestore.DocumentRef, user *firebaseAuth.UserRecord) error {
	_, err := ref.Update(ctx, []firestore.Update{
		{Path: "avatarURL", Value: user.PhotoURL},
		{Path: "updatedAt", Value: time.Now().UTC().Format(time.RFC3339)},
	})
	return err
}
