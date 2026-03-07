package pkg

import "github.com/go-playground/validator/v10"

// Validate is the shared validator instance used by all handlers.
var Validate *validator.Validate

func init() {
	Validate = validator.New(validator.WithRequiredStructEnabled())
}
