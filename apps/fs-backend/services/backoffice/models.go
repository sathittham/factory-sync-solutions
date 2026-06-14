package backoffice

import (
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/result"
)

// Project mirrors the projects/{projectID} Firestore document.
type Project struct {
	ProjectID    string `json:"projectID" firestore:"projectID"`
	Name         string `json:"name" firestore:"name"`
	CompanyRegID string `json:"companyRegId" firestore:"companyRegId"`
	IndustryType string `json:"industryType" firestore:"industryType"`
	CompanySize  string `json:"companySize" firestore:"companySize"`
	OwnerUID     string `json:"ownerUID" firestore:"ownerUID"`
	MemberCount  int    `json:"memberCount" firestore:"memberCount"`
	IsActive     bool   `json:"isActive" firestore:"isActive"`
	CreatedAt    string `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    string `json:"updatedAt" firestore:"updatedAt"`
}

// Member mirrors projects/{projectID}/members/{uid} subdocuments.
type Member struct {
	UID         string `json:"uid" firestore:"uid"`
	Email       string `json:"email" firestore:"email"`
	DisplayName string `json:"displayName" firestore:"displayName"`
	ProjectRole string `json:"projectRole" firestore:"projectRole"`
	JoinMethod  string `json:"joinMethod" firestore:"joinMethod"`
	JoinedAt    string `json:"joinedAt" firestore:"joinedAt"`
	IsActive    bool   `json:"isActive" firestore:"isActive"`
}

// StaffMember is a backoffice user with their assigned role.
type StaffMember struct {
	UID            string `json:"uid"`
	Email          string `json:"email"`
	DisplayName    string `json:"displayName"`
	BackofficeRole string `json:"backofficeRole"`
}

// UserProfile mirrors a user profile with Firebase Auth data used by backoffice.
type UserProfile struct {
	profile.Profile
	PhotoURL string `json:"photoURL"`
}

// BackofficeStats is the dashboard summary response.
type BackofficeStats struct {
	TotalProjects int     `json:"totalProjects"`
	TotalUsers    int     `json:"totalUsers"`
	AvgScore      float64 `json:"avgScore"`
	StaffCount    int     `json:"staffCount"`
}

type APIDocsVersion struct {
	APIVersion string `json:"apiVersion"`
	Label      string `json:"label"`
	IsCurrent  bool   `json:"isCurrent"`
}

type APIDocsVersionsResponse struct {
	Versions []APIDocsVersion `json:"versions"`
}

type APIDocsMetadata struct {
	Environment    string `json:"environment"`
	APIVersion     string `json:"apiVersion"`
	GitSHA         string `json:"gitSHA"`
	GeneratedAt    string `json:"generatedAt"`
	OpenAPIVersion string `json:"openapiVersion"`
	JSONKey        string `json:"jsonKey"`
	YAMLKey        string `json:"yamlKey"`
}

type APIDocsSpecResponse struct {
	Spec any `json:"spec"`
}

type APIDocsYAMLResponse struct {
	YAML string `json:"yaml"`
}

// CreateProjectRequest is the payload for POST /backoffice/projects.
type CreateProjectRequest struct {
	Name         string `json:"name" validate:"required,min=2,max=200"`
	CompanyRegID string `json:"companyRegId" validate:"required,len=13,numeric"`
	IndustryType string `json:"industryType" validate:"required"`
	CompanySize  string `json:"companySize" validate:"required,oneof=small medium large"`
}

// UpdateProjectRequest is the payload for PUT /backoffice/projects/{id}.
type UpdateProjectRequest struct {
	Name         string `json:"name" validate:"omitempty,min=2,max=200"`
	IndustryType string `json:"industryType" validate:"omitempty"`
	CompanySize  string `json:"companySize" validate:"omitempty,oneof=small medium large"`
}

// ChangeMemberRoleRequest is the payload for PUT /backoffice/projects/{id}/members/{uid}/role.
type ChangeMemberRoleRequest struct {
	ProjectRole string `json:"projectRole" validate:"required,oneof=owner system_admin manager general_user"`
}

// InviteOwnerRequest is the payload for POST /backoffice/projects/{id}/invite-owner.
type InviteOwnerRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// InviteOwnerResponse confirms the owner invitation target.
type InviteOwnerResponse struct {
	UID         string `json:"uid"`
	Email       string `json:"email"`
	ProjectID   string `json:"projectID"`
	ProjectRole string `json:"projectRole"`
	ExpiresAt   string `json:"expiresAt"`
}

// SetUserRoleRequest is the payload for PUT /backoffice/users/{uid}/role.
type SetUserRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=admin user owner system_admin manager general_user"`
}

// SetStaffRoleRequest is the payload for PUT /backoffice/staff/{uid}.
type SetStaffRoleRequest struct {
	BackofficeRole string `json:"backofficeRole" validate:"required,oneof=superadmin staff"`
}

// InviteStaffRequest is the payload for POST /backoffice/staff/invitations.
type InviteStaffRequest struct {
	Email          string `json:"email" validate:"required,email"`
	BackofficeRole string `json:"backofficeRole" validate:"required,oneof=superadmin staff"`
}

// EnrichedAssessment joins result data with project/profile data for backoffice views.
type EnrichedAssessment struct {
	result.Assessment
	CompanyName  string `json:"companyName"`
	IndustryType string `json:"industryType"`
	CompanySize  string `json:"companySize"`
	ContactName  string `json:"contactName"`
	ContactEmail string `json:"contactEmail"`
	ProjectID    string `json:"projectID"`
}
