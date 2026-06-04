package scoring

import (
	"testing"
)

var testDimensions = []Dimension{
	{ID: "quality-management", NameTh: "การจัดการคุณภาพ", NameEn: "Quality Management", Weight: 1.0},
	{ID: "safety-compliance", NameTh: "ความปลอดภัย", NameEn: "Safety & Compliance", Weight: 1.0},
	{ID: "equipment-maintenance", NameTh: "เครื่องจักร", NameEn: "Equipment & Maintenance", Weight: 1.0},
	{ID: "workforce-training", NameTh: "บุคลากร", NameEn: "Workforce & Training", Weight: 1.0},
	{ID: "digital-transformation", NameTh: "ดิจิทัล", NameEn: "Digital Transformation", Weight: 1.0},
	{ID: "supply-chain", NameTh: "ห่วงโซ่อุปทาน", NameEn: "Supply Chain Management", Weight: 1.0},
	{ID: "environmental-sustainability", NameTh: "สิ่งแวดล้อม", NameEn: "Environmental Sustainability", Weight: 1.0},
}

func makeQuestions() []Question {
	questions := make([]Question, 0, 35)
	for _, dim := range testDimensions {
		for i := 1; i <= 5; i++ {
			questions = append(questions, Question{
				ID:          dim.ID + "-q" + string(rune('0'+i)),
				DimensionID: dim.ID,
				TextEn:      "test question",
				Weight:      1.0,
			})
		}
	}
	return questions
}

func makeAnswers(questions []Question, value int) []QuizAnswer {
	answers := make([]QuizAnswer, 0, len(questions))
	for _, q := range questions {
		answers = append(answers, QuizAnswer{
			QuestionID: q.ID,
			Value:      value,
		})
	}
	return answers
}

func TestComputeScores_AllOnes(t *testing.T) {
	questions := makeQuestions()
	answers := makeAnswers(questions, 1)

	result := ComputeScores(questions, testDimensions, answers)

	if result.OverallScore != 1.0 {
		t.Errorf("overallScore = %.2f, want 1.00", result.OverallScore)
	}
	if result.Diagnosis != "Beginning" {
		t.Errorf("diagnosis = %s, want Beginning", result.Diagnosis)
	}
	if len(result.Strengths) != 0 {
		t.Errorf("strengths count = %d, want 0", len(result.Strengths))
	}
	if len(result.Weaknesses) != 7 {
		t.Errorf("weaknesses count = %d, want 7", len(result.Weaknesses))
	}
}

func TestComputeScores_AllFives(t *testing.T) {
	questions := makeQuestions()
	answers := makeAnswers(questions, 5)

	result := ComputeScores(questions, testDimensions, answers)

	if result.OverallScore != 5.0 {
		t.Errorf("overallScore = %.2f, want 5.00", result.OverallScore)
	}
	if result.Diagnosis != "Advanced" {
		t.Errorf("diagnosis = %s, want Advanced", result.Diagnosis)
	}
	if len(result.Strengths) != 7 {
		t.Errorf("strengths count = %d, want 7", len(result.Strengths))
	}
	if len(result.Weaknesses) != 0 {
		t.Errorf("weaknesses count = %d, want 0", len(result.Weaknesses))
	}
}

func TestComputeScores_AllThrees(t *testing.T) {
	questions := makeQuestions()
	answers := makeAnswers(questions, 3)

	result := ComputeScores(questions, testDimensions, answers)

	if result.OverallScore != 3.0 {
		t.Errorf("overallScore = %.2f, want 3.00", result.OverallScore)
	}
	if result.Diagnosis != "Established" {
		t.Errorf("diagnosis = %s, want Established", result.Diagnosis)
	}
	// 3.0 is not >= 3.50 so no strengths
	if len(result.Strengths) != 0 {
		t.Errorf("strengths count = %d, want 0", len(result.Strengths))
	}
	// 3.0 is not < 2.50 so no weaknesses
	if len(result.Weaknesses) != 0 {
		t.Errorf("weaknesses count = %d, want 0", len(result.Weaknesses))
	}
}

func TestComputeScores_MixedScores(t *testing.T) {
	questions := makeQuestions()
	// Give different scores per dimension by overriding specific answers
	answers := makeAnswers(questions, 3) // default 3

	// Make Quality Management score 5 (all 5s)
	for i := 0; i < 5; i++ {
		answers[i].Value = 5
	}
	// Make Safety & Compliance score 1 (all 1s)
	for i := 5; i < 10; i++ {
		answers[i].Value = 1
	}

	result := ComputeScores(questions, testDimensions, answers)

	// Quality Management = 5.0 (strength)
	// Safety = 1.0 (weakness)
	// Other 5 dims = 3.0 each
	// Overall = (5 + 1 + 3*5) / 7 = 21/7 = 3.0
	if result.OverallScore != 3.0 {
		t.Errorf("overallScore = %.2f, want 3.00", result.OverallScore)
	}
	if result.Diagnosis != "Established" {
		t.Errorf("diagnosis = %s, want Established", result.Diagnosis)
	}

	foundStrength := false
	for _, s := range result.Strengths {
		if s == "Quality Management" {
			foundStrength = true
		}
	}
	if !foundStrength {
		t.Error("expected Quality Management in strengths")
	}

	foundWeakness := false
	for _, w := range result.Weaknesses {
		if w == "Safety & Compliance" {
			foundWeakness = true
		}
	}
	if !foundWeakness {
		t.Error("expected Safety & Compliance in weaknesses")
	}
}

func TestComputeScores_EmptyAnswers(t *testing.T) {
	questions := makeQuestions()
	result := ComputeScores(questions, testDimensions, []QuizAnswer{})

	if result.OverallScore != 0.0 {
		t.Errorf("overallScore = %.2f, want 0.00", result.OverallScore)
	}
	if len(result.DimensionScores) != 0 {
		t.Errorf("dimension scores count = %d, want 0", len(result.DimensionScores))
	}
}

func TestComputeScores_DimensionOrder(t *testing.T) {
	questions := makeQuestions()
	answers := makeAnswers(questions, 3)

	result := ComputeScores(questions, testDimensions, answers)

	if len(result.DimensionScores) != 7 {
		t.Fatalf("expected 7 dimension scores, got %d", len(result.DimensionScores))
	}

	expectedOrder := []string{
		"Quality Management",
		"Safety & Compliance",
		"Equipment & Maintenance",
		"Workforce & Training",
		"Digital Transformation",
		"Supply Chain Management",
		"Environmental Sustainability",
	}
	for i, ds := range result.DimensionScores {
		if ds.DimensionName != expectedOrder[i] {
			t.Errorf("dimension[%d] = %s, want %s", i, ds.DimensionName, expectedOrder[i])
		}
	}
}

func TestDetermineDiagnosis(t *testing.T) {
	tests := []struct {
		score float64
		want  string
	}{
		{1.00, "Beginning"},
		{1.50, "Beginning"},
		{1.99, "Beginning"},
		{2.00, "Developing"},
		{2.50, "Developing"},
		{2.99, "Developing"},
		{3.00, "Established"},
		{3.50, "Established"},
		{3.99, "Established"},
		{4.00, "Advanced"},
		{4.50, "Advanced"},
		{5.00, "Advanced"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := DetermineDiagnosis(tt.score)
			if got != tt.want {
				t.Errorf("DetermineDiagnosis(%.2f) = %s, want %s", tt.score, got, tt.want)
			}
		})
	}
}

func TestLoadQuestions(t *testing.T) {
	config, err := LoadQuestions("../../config/questions.json")
	if err != nil {
		t.Fatalf("LoadQuestions: %v", err)
	}
	if len(config.Questions) != 43 {
		t.Errorf("questions count = %d, want 43", len(config.Questions))
	}
	if len(config.Dimensions) != 8 {
		t.Errorf("dimensions count = %d, want 8", len(config.Dimensions))
	}
}
