// set-superadmin bootstraps or updates a backoffice user's role by email.
// Run once from apps/backend/:
//
//	ENVIRONMENT=development go run ./cmd/set-superadmin --email s.sathittham@gmail.com
//
// Also sets a non-superadmin staff role, optionally creating the Firebase
// Auth user first (e.g. to provision an e2e test account on staging):
//
//	ENVIRONMENT=staging go run ./cmd/set-superadmin \
//	  --email staff-e2e@factorysyncsolutions.com --role staff \
//	  --create --password '<generated>'
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"maps"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/joho/godotenv"
)

// resolveUser looks up the user by email, creating it first if requested and missing.
func resolveUser(
	ctx context.Context,
	authClient *auth.Client,
	email, password, displayName string,
	create bool,
) (*auth.UserRecord, error) {
	user, err := authClient.GetUserByEmail(ctx, email)
	if err == nil {
		return user, nil
	}
	if !auth.IsUserNotFound(err) || !create {
		return nil, fmt.Errorf("user not found for email %q: %w", email, err)
	}

	toCreate := (&auth.UserToCreate{}).Email(email).Password(password).EmailVerified(true)
	if displayName != "" {
		toCreate = toCreate.DisplayName(displayName)
	}
	user, err = authClient.CreateUser(ctx, toCreate)
	if err != nil {
		return nil, fmt.Errorf("create user %q: %w", email, err)
	}
	fmt.Printf("✓ created %s (uid: %s)\n", email, user.UID)
	return user, nil
}

func main() {
	email := flag.String("email", "", "email address of the user to promote")
	role := flag.String("role", "superadmin", "backofficeRole to set: staff or superadmin")
	create := flag.Bool("create", false, "create the Firebase Auth user if it doesn't exist yet")
	password := flag.String("password", "", "password for the new user (required with --create)")
	displayName := flag.String("display-name", "", "display name for the new user (optional, used with --create)")
	flag.Parse()

	if *email == "" {
		log.Fatal("--email is required")
	}
	if *role != "staff" && *role != "superadmin" {
		log.Fatalf("--role must be \"staff\" or \"superadmin\", got %q", *role)
	}
	if *create && *password == "" {
		log.Fatal("--password is required with --create")
	}

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

	user, err := resolveUser(ctx, authClient, *email, *password, *displayName, *create)
	if err != nil {
		log.Fatal(err)
	}

	// Merge into existing claims to avoid clobbering other claims
	claims := make(map[string]any)
	maps.Copy(claims, user.CustomClaims)
	claims["backofficeRole"] = *role

	if err := authClient.SetCustomUserClaims(ctx, user.UID, claims); err != nil {
		log.Fatalf("set custom claims: %v", err)
	}

	fmt.Printf("✓ %s (uid: %s) is now backofficeRole=%s\n", *email, user.UID, *role)
	fmt.Println("  The user must sign out and sign back in for the new claim to take effect.")
}
