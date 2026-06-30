package dbd

// DBD OpenAPI response structures

type DBDResponse struct {
	Status DBDStatus          `json:"status"`
	Data   []DBDJuristicEntry `json:"data"`
}

type DBDStatus struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

type DBDJuristicEntry struct {
	JuristicPerson DBDJuristicPerson `json:"cd:OrganizationJuristicPerson"`
}

type DBDJuristicPerson struct {
	JuristicID       string              `json:"cd:OrganizationJuristicID"`
	NameTH           string              `json:"cd:OrganizationJuristicNameTH"`
	NameEN           string              `json:"cd:OrganizationJuristicNameEN"`
	Type             string              `json:"cd:OrganizationJuristicType"`
	RegisterDate     string              `json:"cd:OrganizationJuristicRegisterDate"`
	Status           string              `json:"cd:OrganizationJuristicStatus"`
	Objective        *DBDObjectiveWrap   `json:"cd:OrganizationJuristicObjective"`
	RegisterCapital  string              `json:"cd:OrganizationJuristicRegisterCapital"`
	BranchName       string              `json:"cd:OrganizationJuristicBranchName"`
	Address          *DBDAddressWrap     `json:"cd:OrganizationJuristicAddress"`
}

type DBDObjectiveWrap struct {
	Objective DBDObjective `json:"td:JuristicObjective"`
}

type DBDObjective struct {
	Code   string `json:"td:JuristicObjectiveCode"`
	TextTH string `json:"td:JuristicObjectiveTextTH"`
	TextEN string `json:"td:JuristicObjectiveTextEN"`
}

type DBDAddressWrap struct {
	AddressType DBDAddress `json:"cr:AddressType"`
}

type DBDAddress struct {
	Address         string              `json:"cd:Address"`
	Building        string              `json:"cd:Building"`
	RoomNo          string              `json:"cd:RoomNo"`
	Floor           string              `json:"cd:Floor"`
	AddressNo       string              `json:"cd:AddressNo"`
	Moo             *string             `json:"cd:Moo"`
	Soi             *string             `json:"cd:Soi"`
	Road            string              `json:"cd:Road"`
	CitySubDivision *DBDLocalityCode    `json:"cd:CitySubDivision"`
	City            *DBDLocalityCode    `json:"cd:City"`
	CountrySubDiv   *DBDCountrySubDiv   `json:"cd:CountrySubDivision"`
}

type DBDLocalityCode struct {
	Code   string `json:"cr:CitySubDivisionCode,omitempty"`
	TextTH string `json:"cr:CitySubDivisionTextTH,omitempty"`
	// City uses different keys
	CityCode   string `json:"cr:CityCode,omitempty"`
	CityTextTH string `json:"cr:CityTextTH,omitempty"`
}

type DBDCountrySubDiv struct {
	Code   string `json:"cr:CountrySubDivisionCode"`
	TextTH string `json:"cr:CountrySubDivisionTextTH"`
}

// Simplified response returned by our API

type CompanyProfile struct {
	JuristicID      string `json:"juristicId"`
	NameTH          string `json:"nameTh"`
	NameEN          string `json:"nameEn"`
	Type            string `json:"type"`
	RegisterDate    string `json:"registerDate"`
	Status          string `json:"status"`
	ObjectiveCode   string `json:"objectiveCode"`
	ObjectiveTextTH string `json:"objectiveTextTh"`
	ObjectiveTextEN string `json:"objectiveTextEn"`
	RegisterCapital string `json:"registerCapital"`
	BranchName      string `json:"branchName"`
	Address         string `json:"address"`
	SubDistrict     string `json:"subDistrict"`
	District        string `json:"district"`
	Province        string `json:"province"`
}
