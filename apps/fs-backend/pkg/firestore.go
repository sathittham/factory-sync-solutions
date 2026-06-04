package pkg

import (
	"context"
	"log"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
)

// NewFirestoreClient initializes a Firestore client using the Firebase Admin SDK.
//
// Credential resolution:
//   - Local dev: set GOOGLE_APPLICATION_CREDENTIALS env var or use gcloud auth application-default login
//   - Emulator: set FIRESTORE_EMULATOR_HOST=localhost:8080 (no credentials needed)
//   - GCP (Cloud Functions): uses Application Default Credentials automatically
func NewFirestoreClient(ctx context.Context) *firestore.Client {
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("firestore init: %v", err)
	}

	return client
}
