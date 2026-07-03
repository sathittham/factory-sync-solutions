package chat

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	conversationsCollection = "conversations"
	messagesSubcollection   = "messages"

	// openConversationLookupLimit bounds the per-uid scan used to find the
	// caller's open conversation. Firestore inequality filters (status !=
	// closed) can't be combined with an ORDER BY lastMessageAt without an
	// extra composite index beyond the three specified in the SDD, so we
	// instead fetch the most recent few conversations for the uid (using the
	// userID+lastMessageAt index) and filter status in application code.
	openConversationLookupLimit = 5
)

// RepositoryInterface defines the chat data access contract.
type RepositoryInterface interface {
	CreateConversation(ctx context.Context, conv *Conversation) error
	GetConversation(ctx context.Context, id string) (*Conversation, error)
	GetOpenConversationByUID(ctx context.Context, uid string) (*Conversation, error)
	UpdateConversation(ctx context.Context, conv *Conversation) error
	AppendMessage(ctx context.Context, conversationID string, msg *Message) error
	ListMessages(ctx context.Context, conversationID, cursor string, limit int) ([]Message, string, error)
	RecentMessages(ctx context.Context, conversationID string, limit int) ([]Message, error)
	CountMessagesSince(ctx context.Context, conversationID, role string, since time.Time) (int, error)
}

// Repository implements RepositoryInterface using Firestore.
type Repository struct {
	client *firestore.Client
}

func NewRepository(client *firestore.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) conversationRef(id string) *firestore.DocumentRef {
	return r.client.Collection(conversationsCollection).Doc(id)
}

func (r *Repository) messagesCollection(conversationID string) *firestore.CollectionRef {
	return r.conversationRef(conversationID).Collection(messagesSubcollection)
}

func (r *Repository) CreateConversation(ctx context.Context, conv *Conversation) error {
	if _, err := r.conversationRef(conv.ID).Set(ctx, conv); err != nil {
		return fmt.Errorf("firestore set conversation: %w", err)
	}
	return nil
}

func (r *Repository) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	doc, err := r.conversationRef(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("firestore get conversation: %w", err)
	}

	var conv Conversation
	if err := doc.DataTo(&conv); err != nil {
		return nil, fmt.Errorf("unmarshal conversation: %w", err)
	}
	return &conv, nil
}

func (r *Repository) GetOpenConversationByUID(ctx context.Context, uid string) (*Conversation, error) {
	docs, err := r.client.Collection(conversationsCollection).
		Where("userID", "==", uid).
		OrderBy("lastMessageAt", firestore.Desc).
		Limit(openConversationLookupLimit).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("firestore query open conversation for uid %s: %w", uid, err)
	}

	for _, doc := range docs {
		var conv Conversation
		if err := doc.DataTo(&conv); err != nil {
			return nil, fmt.Errorf("unmarshal conversation: %w", err)
		}
		if conv.Status != StatusClosed {
			return &conv, nil
		}
	}
	return nil, nil
}

func (r *Repository) UpdateConversation(ctx context.Context, conv *Conversation) error {
	if _, err := r.conversationRef(conv.ID).Set(ctx, conv); err != nil {
		return fmt.Errorf("firestore update conversation %s: %w", conv.ID, err)
	}
	return nil
}

func (r *Repository) AppendMessage(ctx context.Context, conversationID string, msg *Message) error {
	if _, err := r.messagesCollection(conversationID).Doc(msg.ID).Set(ctx, msg); err != nil {
		return fmt.Errorf("firestore set message: %w", err)
	}
	return nil
}

// ListMessages returns chronological (ascending) messages for the widget's
// history/poll view. cursor is the last message ID seen by the caller.
func (r *Repository) ListMessages(ctx context.Context, conversationID, cursor string, limit int) ([]Message, string, error) {
	q := r.messagesCollection(conversationID).OrderBy("createdAt", firestore.Asc).Limit(limit)

	if cursor != "" {
		snap, err := r.messagesCollection(conversationID).Doc(cursor).Get(ctx)
		if err != nil {
			if status.Code(err) != codes.NotFound {
				return nil, "", fmt.Errorf("firestore get cursor message %s: %w", cursor, err)
			}
		} else {
			q = q.StartAfter(snap.Data()["createdAt"])
		}
	}

	docs, err := q.Documents(ctx).GetAll()
	if err != nil {
		return nil, "", fmt.Errorf("firestore list messages for conversation %s: %w", conversationID, err)
	}

	messages := make([]Message, 0, len(docs))
	for _, doc := range docs {
		var m Message
		if err := doc.DataTo(&m); err != nil {
			return nil, "", fmt.Errorf("unmarshal message: %w", err)
		}
		messages = append(messages, m)
	}

	nextCursor := ""
	if limit > 0 && len(messages) == limit {
		nextCursor = messages[len(messages)-1].ID
	}
	return messages, nextCursor, nil
}

// RecentMessages returns up to limit messages in chronological (ascending)
// order — used to build the AI engine's history window.
func (r *Repository) RecentMessages(ctx context.Context, conversationID string, limit int) ([]Message, error) {
	docs, err := r.messagesCollection(conversationID).
		OrderBy("createdAt", firestore.Desc).
		Limit(limit).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("firestore recent messages for conversation %s: %w", conversationID, err)
	}

	messages := make([]Message, len(docs))
	for i, doc := range docs {
		var m Message
		if err := doc.DataTo(&m); err != nil {
			return nil, fmt.Errorf("unmarshal message: %w", err)
		}
		messages[len(docs)-1-i] = m
	}
	return messages, nil
}

// CountMessagesSince counts messages of the given role created at or after
// since — used for the per-conversation rate limit. Filters role in
// application code after a single-field inequality query so no additional
// composite index is required beyond the three in the SDD.
func (r *Repository) CountMessagesSince(ctx context.Context, conversationID, role string, since time.Time) (int, error) {
	docs, err := r.messagesCollection(conversationID).
		Where("createdAt", ">=", since).
		Documents(ctx).GetAll()
	if err != nil {
		return 0, fmt.Errorf("firestore count messages since for conversation %s: %w", conversationID, err)
	}

	count := 0
	for _, doc := range docs {
		if roleVal, _ := doc.Data()["role"].(string); roleVal == role {
			count++
		}
	}
	return count, nil
}
