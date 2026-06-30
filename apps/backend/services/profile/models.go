package profile

// Profile represents a user's profile in the users Firestore collection.
type Profile struct {
	UID                string            `json:"uid" firestore:"uid"`
	Email              string            `json:"email" firestore:"email"`
	DisplayName        string            `json:"displayName" firestore:"displayName"`
	AvatarURL          string            `json:"avatarURL" firestore:"avatarURL"`
	CompanyName        string            `json:"companyName" firestore:"companyName"`
	CompanyRegID       string            `json:"companyRegId" firestore:"companyRegId"`
	IndustryType       string            `json:"industryType" firestore:"industryType"`
	CompanySize        string            `json:"companySize" firestore:"companySize"`
	ContactName        string            `json:"contactName" firestore:"contactName"`
	ContactEmail       string            `json:"contactEmail" firestore:"contactEmail"`
	ContactPhone       string            `json:"contactPhone" firestore:"contactPhone"`
	Role               string            `json:"role" firestore:"role"`
	ProjectRoles       map[string]string `json:"projectRoles,omitempty" firestore:"projectRoles,omitempty"`
	ConsentVersion     string            `json:"consentVersion" firestore:"consentVersion"`
	ConsentAt          string            `json:"consentAt" firestore:"consentAt"`
	EmailNotifications bool              `json:"emailNotifications" firestore:"emailNotifications"`
	CreatedAt          string            `json:"createdAt" firestore:"createdAt"`
	UpdatedAt          string            `json:"updatedAt" firestore:"updatedAt"`
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
	ConsentVersion string `json:"consentVersion"`
}

// UpdateProfileRequest allows updating mutable profile fields.
type UpdateProfileRequest struct {
	CompanyName        string `json:"companyName" validate:"omitempty,min=2,max=200"`
	IndustryType       string `json:"industryType" validate:"omitempty"`
	CompanySize        string `json:"companySize" validate:"omitempty,oneof=small medium large"`
	ContactName        string `json:"contactName" validate:"omitempty,min=2,max=100"`
	ContactEmail       string `json:"contactEmail" validate:"omitempty,email"`
	ContactPhone       string `json:"contactPhone" validate:"omitempty"`
	EmailNotifications *bool  `json:"emailNotifications"`
}

// ActivityEventResponse is a single entry in the user's activity log.
type ActivityEventResponse struct {
	ID           string         `json:"id"`
	ActorUID     string         `json:"actorUID,omitempty"`
	ActorEmail   string         `json:"actorEmail,omitempty"`
	ActorName    string         `json:"actorName,omitempty"`
	EventType    string         `json:"eventType"`
	ResourceType string         `json:"resourceType,omitempty"`
	ResourceID   string         `json:"resourceID,omitempty"`
	TargetUID    string         `json:"targetUID,omitempty"`
	ProjectID    string         `json:"projectID,omitempty"`
	CreatedAt    string         `json:"createdAt"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

// ProfileResponse is the public API response (omits internal fields).
type ProfileResponse struct {
	UID                string `json:"uid"`
	Email              string `json:"email"`
	DisplayName        string `json:"displayName"`
	AvatarURL          string `json:"avatarURL"`
	CompanyName        string `json:"companyName"`
	CompanyRegID       string `json:"companyRegId"`
	IndustryType       string `json:"industryType"`
	CompanySize        string `json:"companySize"`
	ContactName        string `json:"contactName"`
	ContactEmail       string `json:"contactEmail"`
	ContactPhone       string `json:"contactPhone"`
	Role               string `json:"role"`
	ConsentVersion     string `json:"consentVersion"`
	EmailNotifications bool   `json:"emailNotifications"`
	CreatedAt          string `json:"createdAt"`
}
