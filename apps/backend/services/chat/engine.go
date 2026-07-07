package chat

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"google.golang.org/genai"
)

// Turn role constants understood by modelClient implementations — kept
// independent of the underlying SDK's role type so the interface stays
// swappable (SDD §2.3 roadmap: ADK-Go migration is contained behind engine.go).
const (
	TurnRoleUser  = "user"
	TurnRoleModel = "model"
)

// Turn is one message in the conversation history sent to the model.
type Turn struct {
	Role string // TurnRoleUser | TurnRoleModel
	Text string
}

// modelClient is the minimal contract the AI engine needs from an LLM
// backend. escalate is true when the model decided (via the escalate_to_human
// tool) that a human should take over; reason explains why.
type modelClient interface {
	Generate(ctx context.Context, system string, history []Turn) (reply string, escalate bool, reason string, err error)
}

const (
	historyWindow     = 20
	maxOutputTokens   = 1024
	escalateToolName  = "escalate_to_human"
	fallbackReasonAI  = "AI engine unavailable"
	fallbackReasonErr = "AI engine error"
)

// explicitHumanKeywords are case-insensitive substrings that, when present in
// a customer message, skip the model call entirely and escalate immediately
// (FR-006). Thai + English phrasings per the product spec.
var explicitHumanKeywords = []string{
	"ขอคุยกับคน",
	"คุยกับพนักงาน",
	"ติดต่อเจ้าหน้าที่",
	"talk to a human",
	"speak to a person",
	"human agent",
}

// Engine generates AI replies for chat conversations. A nil *Engine, or an
// Engine whose underlying modelClient is nil, degrades gracefully to a canned
// bilingual apology + auto-escalation — mirrors the nil EmailClient pattern in
// services/notification (FR-005).
type Engine struct {
	client       modelClient
	systemPrompt string
}

// NewEngine builds an Engine. client may be nil (e.g. Vertex AI unconfigured
// in local dev) — Reply degrades gracefully in that case.
func NewEngine(client modelClient, systemPrompt string) *Engine {
	return &Engine{client: client, systemPrompt: systemPrompt}
}

// Reply generates a bot reply for the given customer message and windowed
// conversation history (last 20 turns). It never returns an error: engine or
// model failures degrade to a canned bilingual apology and auto-escalation
// instead of propagating to the caller.
func (e *Engine) Reply(ctx context.Context, history []Turn, customerText string) (text string, escalate bool, reason string) {
	if containsHumanRequest(customerText) {
		return handoffMessage(), true, "customer explicitly requested a human agent"
	}

	if e == nil || e.client == nil {
		slog.Warn("chat engine not configured; using canned fallback")
		return fallbackMessage(), true, fallbackReasonAI
	}

	windowed := history
	if len(windowed) > historyWindow {
		windowed = windowed[len(windowed)-historyWindow:]
	}

	reply, shouldEscalate, escReason, err := e.client.Generate(ctx, e.systemPrompt, windowed)
	if err != nil {
		slog.Error("chat engine generate failed", "error", err.Error())
		return fallbackMessage(), true, fallbackReasonErr
	}
	if shouldEscalate {
		if escReason == "" {
			escReason = "model requested escalation"
		}
		return handoffMessage(), true, escReason
	}
	return reply, false, ""
}

func containsHumanRequest(text string) bool {
	lower := strings.ToLower(text)
	for _, kw := range explicitHumanKeywords {
		if strings.Contains(lower, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

func fallbackMessage() string {
	return "ขออภัยค่ะ ระบบผู้ช่วย AI ขัดข้องชั่วคราว ทีมงานของเราจะติดต่อกลับโดยเร็วที่สุด\n" +
		"Sorry, our AI assistant is temporarily unavailable. A member of our support team will follow up shortly."
}

func handoffMessage() string {
	return "รับทราบค่ะ ทีมงานของเราจะเข้ามาช่วยเหลือคุณโดยเร็วที่สุด (ในเวลาทำการ)\n" +
		"Got it — a member of our support team will join this chat shortly (during business hours)."
}

// LoadSystemPrompt reads the curated knowledge file and appends the fixed
// behavioral rules that ground every reply (SDD §3.2).
func LoadSystemPrompt(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read chatbot knowledge file %s: %w", path, err)
	}
	return string(data) + "\n\n" + behavioralRules, nil
}

const behavioralRules = `## Behavioral Rules

- Always answer in the customer's language (Thai or English), matching the language of their most recent message.
- Stay strictly within the scope of the knowledge above. If you do not know the answer, say so honestly and offer to escalate to the human support team — never invent capabilities, pricing, or commitments.
- Never invent or promise specific pricing; direct pricing questions to the human team via escalation or the contact email.
- Keep replies concise, warm, and professional.
- If the customer explicitly asks to speak with a human, or you cannot help, call the escalate_to_human tool with a short reason instead of guessing.`

// --- Production model client: Vertex AI Gemini Flash via google.golang.org/genai ---

// NewVertexModelClientFromEnv builds a modelClient backed by Vertex AI using
// ADC (no API key). Returns (nil, nil) when CHATBOT_MODEL is unset — the
// caller should pass the nil client into NewEngine, which degrades
// gracefully. Returns an error only when CHATBOT_MODEL is set but the
// supporting env vars/client construction fail (a genuine misconfiguration).
func NewVertexModelClientFromEnv(ctx context.Context) (modelClient, error) {
	model := os.Getenv("CHATBOT_MODEL")
	if model == "" {
		return nil, nil
	}

	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = os.Getenv("GOOGLE_CLOUD_PROJECT")
	}
	location := os.Getenv("VERTEX_LOCATION")
	if projectID == "" || location == "" {
		return nil, fmt.Errorf("chat: CHATBOT_MODEL is set but GCP_PROJECT_ID/GOOGLE_CLOUD_PROJECT or VERTEX_LOCATION is missing")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  projectID,
		Location: location,
	})
	if err != nil {
		return nil, fmt.Errorf("create vertex genai client: %w", err)
	}

	return &vertexModelClient{client: client, model: model}, nil
}

type vertexModelClient struct {
	client *genai.Client
	model  string
}

func (v *vertexModelClient) Generate(ctx context.Context, system string, history []Turn) (string, bool, string, error) {
	contents := make([]*genai.Content, 0, len(history))
	for _, t := range history {
		role := genai.RoleModel
		if t.Role == TurnRoleUser {
			role = genai.RoleUser
		}
		contents = append(contents, genai.NewContentFromText(t.Text, genai.Role(role)))
	}

	cfg := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(system, genai.RoleUser),
		MaxOutputTokens:   maxOutputTokens,
		Tools:             []*genai.Tool{escalateTool()},
	}

	resp, err := v.client.Models.GenerateContent(ctx, v.model, contents, cfg)
	if err != nil {
		return "", false, "", fmt.Errorf("vertex generate content: %w", err)
	}

	for _, call := range resp.FunctionCalls() {
		if call.Name != escalateToolName {
			continue
		}
		reason, _ := call.Args["reason"].(string)
		return "", true, reason, nil
	}

	return resp.Text(), false, "", nil
}

func escalateTool() *genai.Tool {
	return &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{
			{
				Name:        escalateToolName,
				Description: "Escalate the conversation to a human support agent when you cannot help, the customer explicitly asks for a person, or the question is outside your knowledge.",
				Parameters: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"reason": {
							Type:        genai.TypeString,
							Description: "Short reason the conversation needs a human",
						},
					},
					Required: []string{"reason"},
				},
			},
		},
	}
}
