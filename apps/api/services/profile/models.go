package profile

// Profile represents a user's profile in the users Firestore collection.
type Profile struct {
	UID          string `json:"uid" firestore:"uid"`
	Email        string `json:"email" firestore:"email"`
	DisplayName  string `json:"displayName" firestore:"displayName"`
	CompanyName  string `json:"companyName" firestore:"companyName"`
	CompanyRegID string `json:"companyRegId" firestore:"companyRegId"`
	IndustryType string `json:"industryType" firestore:"industryType"`
	CompanySize  string `json:"companySize" firestore:"companySize"`
	ContactName  string `json:"contactName" firestore:"contactName"`
	ContactEmail string `json:"contactEmail" firestore:"contactEmail"`
	ContactPhone string `json:"contactPhone" firestore:"contactPhone"`
	Role         string `json:"role" firestore:"role"`
	CreatedAt    string `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    string `json:"updatedAt" firestore:"updatedAt"`
}

// CreateProfileRequest is the registration form payload.
type CreateProfileRequest struct {
	CompanyName    string `json:"companyName" validate:"required,min=2,max=200"`
	CompanyRegID   string `json:"companyRegId" validate:"required,len=13,numeric"`
	IndustryType   string `json:"industryType" validate:"required"`
	CompanySize    string `json:"companySize" validate:"required,oneof=small medium large"`
	ContactName    string `json:"contactName" validate:"required,min=2,max=100"`
	ContactEmail   string `json:"contactEmail" validate:"required,email"`
	ContactPhone   string `json:"contactPhone" validate:"required"`
	TurnstileToken string `json:"turnstileToken" validate:"required"`
}

// UpdateProfileRequest allows updating mutable profile fields.
type UpdateProfileRequest struct {
	CompanyName  string `json:"companyName" validate:"omitempty,min=2,max=200"`
	IndustryType string `json:"industryType" validate:"omitempty"`
	CompanySize  string `json:"companySize" validate:"omitempty,oneof=small medium large"`
	ContactName  string `json:"contactName" validate:"omitempty,min=2,max=100"`
	ContactEmail string `json:"contactEmail" validate:"omitempty,email"`
	ContactPhone string `json:"contactPhone" validate:"omitempty"`
}

// ProfileResponse is the public API response (omits internal fields).
type ProfileResponse struct {
	UID          string `json:"uid"`
	Email        string `json:"email"`
	DisplayName  string `json:"displayName"`
	CompanyName  string `json:"companyName"`
	CompanyRegID string `json:"companyRegId"`
	IndustryType string `json:"industryType"`
	CompanySize  string `json:"companySize"`
	ContactName  string `json:"contactName"`
	ContactEmail string `json:"contactEmail"`
	ContactPhone string `json:"contactPhone"`
	Role         string `json:"role"`
	CreatedAt    string `json:"createdAt"`
}
