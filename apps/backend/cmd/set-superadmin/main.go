// set-superadmin bootstraps the first backoffice superadmin by email.
// Run once from apps/backend/:
//
//	ENVIRONMENT=development go run ./cmd/set-superadmin --email s.sathittham@gmail.com
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
)

func main() {
	email := flag.String("email", "", "email address of the user to promote to superadmin")
	flag.Parse()

	if *email == "" {
		log.Fatal("--email is required")
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

	user, err := authClient.GetUserByEmail(ctx, *email)
	if err != nil {
		log.Fatalf("user not found for email %q: %v", *email, err)
	}

	// Merge into existing claims to avoid clobbering other claims
	claims := make(map[string]any)
	for k, v := range user.CustomClaims {
		claims[k] = v
	}
	claims["backofficeRole"] = "superadmin"

	if err := authClient.SetCustomUserClaims(ctx, user.UID, claims); err != nil {
		log.Fatalf("set custom claims: %v", err)
	}

	fmt.Printf("✓ %s (uid: %s) is now backofficeRole=superadmin\n", *email, user.UID)
	fmt.Println("  The user must sign out and sign back in for the new claim to take effect.")
}
