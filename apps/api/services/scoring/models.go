package scoring

// QuizConfig represents the quiz configuration loaded from questions.json.
type QuizConfig struct {
	Version    string      `json:"version"`
	Dimensions []Dimension `json:"dimensions"`
	Questions  []Question  `json:"questions"`
}

type Dimension struct {
	ID     string  `json:"id"`
	NameTh string  `json:"nameTh"`
	NameEn string  `json:"nameEn"`
	Weight float64 `json:"weight"`
}

type RubricLevel struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type Question struct {
	ID          string                    `json:"id"`
	DimensionID string                    `json:"dimensionId"`
	TextTh      string                    `json:"textTh"`
	TextEn      string                    `json:"textEn"`
	Weight      float64                   `json:"weight"`
	Rubric      map[string]RubricLevel    `json:"rubric,omitempty"`
}

// QuizAnswer represents a single user answer.
type QuizAnswer struct {
	QuestionID string `json:"questionId" validate:"required"`
	Value      int    `json:"value" validate:"required,min=1,max=5"`
}

// DimensionScore represents the computed score for one dimension.
type DimensionScore struct {
	DimensionID     string  `json:"dimensionId" firestore:"dimensionId"`
	DimensionName   string  `json:"dimensionName" firestore:"dimensionName"`
	DimensionNameTh string  `json:"dimensionNameTh" firestore:"dimensionNameTh"`
	Score           float64 `json:"score" firestore:"score"`
	MaxScore        float64 `json:"maxScore" firestore:"maxScore"`
}

// ScoringResult contains the full computed result from quiz answers.
type ScoringResult struct {
	DimensionScores []DimensionScore `json:"scores"`
	OverallScore    float64          `json:"overallScore"`
	Strengths       []string         `json:"strengths"`
	Weaknesses      []string         `json:"weaknesses"`
	Diagnosis       string           `json:"diagnosis"`
}
