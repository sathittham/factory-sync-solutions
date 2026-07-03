/**
 * Types for the shared AI-chat widget (`@shared/ui/chat-widget`).
 *
 * Mirrors `apps/backend/services/chat/models.go` and the API contract in
 * `docs/architecture/ai-chatbot-design.md` §5.1. Dates cross the wire as
 * ISO-8601 strings (JSON), not `Date` objects.
 */

export type Locale = 'th' | 'en';

export type ChatChannel = 'web-app' | 'web-official' | 'line';

/** Conversation status machine: `bot → escalated → human → closed` (`* → closed`). */
export type ConversationStatus = 'bot' | 'escalated' | 'human' | 'closed';

export type MessageRole = 'customer' | 'bot' | 'agent';

export interface Conversation {
  id: string;
  channel: ChatChannel;
  userID: string;
  status: ConversationStatus;
  locale: Locale;
  lastMessageAt: string;
  lastMessagePreview: string;
  messageCount: number;
  agentUID?: string;
  escalatedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

export interface StartConversationRequest {
  text: string;
  locale: Locale;
}

export interface SendMessageRequest {
  text: string;
}

export interface StartConversationResponse {
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  message: ChatMessage;
  reply: ChatMessage | null;
}

/** `{ success, data, meta }` envelope shared by every backend response (`pkg.RespondJSON`/`RespondList`). */
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message?: string;
    [key: string]: unknown;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface ListMessagesMeta {
  nextCursor?: string;
}
