package scoring

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
)

// LoadQuestions reads and parses the quiz configuration from a JSON file.
func LoadQuestions(path string) (*QuizConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read questions file: %w", err)
	}

	var config QuizConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("parse questions file: %w", err)
	}

	return &config, nil
}

// ComputeScores calculates dimension scores, overall score, strengths,
// weaknesses, and diagnosis from quiz answers.
func ComputeScores(questions []Question, dimensions []Dimension, answers []QuizAnswer) *ScoringResult {
	// Build a map of questionID → answer value
	answerMap := make(map[string]int, len(answers))
	for _, a := range answers {
		answerMap[a.QuestionID] = a.Value
	}

	// Build dimension name lookup
	dimNames := make(map[string]string, len(dimensions))
	for _, d := range dimensions {
		dimNames[d.ID] = d.NameEn
	}

	// Group questions by dimension
	type dimAccum struct {
		weightedSum float64
		totalWeight float64
	}
	dims := make(map[string]*dimAccum)

	for _, q := range questions {
		val, ok := answerMap[q.ID]
		if !ok {
			continue
		}
		if _, exists := dims[q.DimensionID]; !exists {
			dims[q.DimensionID] = &dimAccum{}
		}
		dims[q.DimensionID].weightedSum += float64(val) * q.Weight
		dims[q.DimensionID].totalWeight += q.Weight
	}

	// Compute dimension scores
	dimScores := make([]DimensionScore, 0, len(dims))
	var totalDimScore float64

	for dimID, acc := range dims {
		score := 0.0
		if acc.totalWeight > 0 {
			score = roundTo2(acc.weightedSum / acc.totalWeight)
		}
		dimScores = append(dimScores, DimensionScore{
			DimensionID:   dimID,
			DimensionName: dimNames[dimID],
			Score:         score,
			MaxScore:      5.0,
		})
		totalDimScore += score
	}

	// Sort dimension scores by the order defined in quiz config
	sortDimensionScores(dimScores, questions)

	// Overall score
	overallScore := 0.0
	if len(dimScores) > 0 {
		overallScore = roundTo2(totalDimScore / float64(len(dimScores)))
	}

	// Strengths and weaknesses
	var strengths, weaknesses []string
	for _, ds := range dimScores {
		if ds.Score >= 3.50 {
			strengths = append(strengths, ds.DimensionName)
		} else if ds.Score < 2.50 {
			weaknesses = append(weaknesses, ds.DimensionName)
		}
	}

	return &ScoringResult{
		DimensionScores: dimScores,
		OverallScore:    overallScore,
		Strengths:       strengths,
		Weaknesses:      weaknesses,
		Diagnosis:       DetermineDiagnosis(overallScore),
	}
}

// DetermineDiagnosis maps an overall score to a diagnosis category.
func DetermineDiagnosis(score float64) string {
	switch {
	case score >= 4.00:
		return "Advanced"
	case score >= 3.00:
		return "Established"
	case score >= 2.00:
		return "Developing"
	default:
		return "Beginning"
	}
}

func roundTo2(v float64) float64 {
	return math.Round(v*100) / 100
}

// sortDimensionScores sorts dimension scores to match the order questions
// appear in the config (first occurrence of each dimension).
func sortDimensionScores(scores []DimensionScore, questions []Question) {
	order := make(map[string]int)
	idx := 0
	for _, q := range questions {
		if _, exists := order[q.DimensionID]; !exists {
			order[q.DimensionID] = idx
			idx++
		}
	}

	// Simple insertion sort (only 7 elements)
	for i := 1; i < len(scores); i++ {
		for j := i; j > 0 && order[scores[j].DimensionID] < order[scores[j-1].DimensionID]; j-- {
			scores[j], scores[j-1] = scores[j-1], scores[j]
		}
	}
}
