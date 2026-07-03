package pkg

import (
	"encoding/json"
	"net/http"
)

// JSONResponse documents the standard single-resource success envelope.
type JSONResponse struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

// ListResponse documents the standard collection success envelope.
type ListResponse struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
	Count   int  `json:"count"`
}

// ErrorBody documents the standard API error payload.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse documents the standard error envelope.
type ErrorResponse struct {
	Success bool      `json:"success"`
	Error   ErrorBody `json:"error"`
}

func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data":    data,
	})
}

func RespondList(w http.ResponseWriter, data any, count int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data":    data,
		"count":   count,
	})
}

// RespondListMeta is like RespondList but also attaches a meta object —
// used for cursor-paginated collections (e.g. chat message history).
func RespondListMeta(w http.ResponseWriter, data any, count int, meta map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data":    data,
		"count":   count,
		"meta":    meta,
	})
}

func RespondError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}
