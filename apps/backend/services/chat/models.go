package chat

import "time"

// Conversation status machine: bot -> escalated -> human -> closed;
// human -> bot (hand-back); * -> closed. Validated in service.go, never in handlers.
const (
	StatusBot       = "bot"
	StatusEscalated = "escalated"
	StatusHuman     = "human"
	StatusClosed    = "closed"
)

// Channel is the origin of a conversation. "line" is reserved for Phase 4
// (LINE OA) and is never accepted from a client request in Phase 1.
const (
	ChannelWebApp      = "web-app"
	ChannelWebOfficial = "web-official"
	ChannelLine        = "line"
)

// Message roles.
const (
	RoleCustomer = "customer"
	RoleBot      = "bot"
	RoleAgent    = "agent"
)

// Conversation is a thread of messages between one customer and the
// bot/agents on one channel. Firestore doc: conversations/{id}.
type Conversation struct {
	ID                 string     `firestore:"id"                      json:"id"`
	Channel            string     `firestore:"channel"                 json:"channel"` // web-app | web-official | line
	UserID             string     `firestore:"userID"                  json:"userID"`
	LineUserID         string     `firestore:"lineUserID,omitempty"    json:"lineUserID,omitempty"`
	Status             string     `firestore:"status"                  json:"status"` // bot | escalated | human | closed
	Locale             string     `firestore:"locale"                  json:"locale"`
	LastMessageAt      time.Time  `firestore:"lastMessageAt"           json:"lastMessageAt"`
	LastMessagePreview string     `firestore:"lastMessagePreview"      json:"lastMessagePreview"`
	MessageCount       int        `firestore:"messageCount"            json:"messageCount"`
	AgentUID           string     `firestore:"agentUID,omitempty"      json:"agentUID,omitempty"`
	SlackThreadTS      string     `firestore:"slackThreadTS,omitempty" json:"-"`
	EscalatedAt        *time.Time `firestore:"escalatedAt,omitempty"   json:"escalatedAt,omitempty"`
	ClosedAt           *time.Time `firestore:"closedAt,omitempty"      json:"closedAt,omitempty"`
	CreatedAt          time.Time  `firestore:"createdAt"               json:"createdAt"`
}

// Message is one entry in a conversation's messages subcollection.
// Firestore doc: conversations/{id}/messages/{id}.
type Message struct {
	ID               string    `firestore:"id"                        json:"id"`
	Role             string    `firestore:"role"                      json:"role"` // customer | bot | agent
	Text             string    `firestore:"text"                      json:"text"`
	SenderID         string    `firestore:"senderID"                  json:"-"`  // UID / "bot" / agent UID
	ChannelMessageID string    `firestore:"channelMessageID,omitempty" json:"-"` // LINE event id / Slack ts (idempotency)
	CreatedAt        time.Time `firestore:"createdAt"                 json:"createdAt"`
}

// SendMessageRequest is the payload for POST /chat/conversations/{id}/messages.
type SendMessageRequest struct {
	Text string `json:"text" validate:"required,max=4000"`
}

// StartConversationRequest is the payload for POST /chat/conversations.
//
// Channel is a deviation from the SDD §3.1.3 struct: the widget needs to tell
// the server which surface it is calling from (web-app vs web-official) so the
// handler knows whether to require Turnstile, since the server never trusts a
// client-supplied UID/channel blindly — it is restricted to an allowlist and
// defaults to "web-app" when omitted.
type StartConversationRequest struct {
	Text    string `json:"text"    validate:"required,max=4000"`
	Locale  string `json:"locale"  validate:"omitempty,oneof=th en"`
	Channel string `json:"channel" validate:"omitempty,oneof=web-app web-official"`
}
