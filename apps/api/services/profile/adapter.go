package profile

import "context"

// ProfileDataAdapter wraps the profile Service to satisfy the quiz handler's
// profileGetter interface without creating a circular import.
type ProfileDataAdapter struct {
	svc *Service
}

func NewProfileDataAdapter(svc *Service) *ProfileDataAdapter {
	return &ProfileDataAdapter{svc: svc}
}

// GetProfileData returns the notification-relevant fields for a user profile.
func (a *ProfileDataAdapter) GetProfileData(ctx interface{}, uid string) (contactEmail, contactName, companyName string, err error) {
	realCtx, ok := ctx.(context.Context)
	if !ok {
		return "", "", "", nil
	}

	p, err := a.svc.GetProfile(realCtx, uid)
	if err != nil {
		return "", "", "", err
	}
	return p.ContactEmail, p.ContactName, p.CompanyName, nil
}
