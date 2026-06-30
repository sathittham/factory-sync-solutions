package notification

import (
	"github.com/resend/resend-go/v2"
)

// EmailClient sends emails via the Resend API.
type EmailClient struct {
	client *resend.Client
	from   string
}

func NewEmailClient(apiKey, from string) *EmailClient {
	return &EmailClient{
		client: resend.NewClient(apiKey),
		from:   from,
	}
}
