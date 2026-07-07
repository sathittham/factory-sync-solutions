import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiEnvelope,
  ChatMessage,
  Conversation,
  Locale,
  SendMessageResponse,
  StartConversationResponse,
} from './types';

/**
 * TanStack Query hooks for the chat widget (SDD §3.4). The widget is
 * host-agnostic: every request takes its bearer token from `getIdToken()`
 * (web-app: current Firebase user; web-official: anonymous sign-in) rather
 * than reaching into a specific app's auth module.
 */

export interface ChatSessionConfig {
  /** Resolves a fresh Firebase ID token for each request. */
  getIdToken: () => Promise<string>;
  /** e.g. `https://api.factorysyncsolutions.com/v1` or `/api/v1` behind a dev proxy. */
  apiBaseUrl: string;
}

const PENDING_CONVERSATION_KEY = 'pending';
const POLL_INTERVAL_MS = 3000;

export const chatKeys = {
  currentConversation: () => ['chat', 'conversation', 'current'] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
};

export class ChatApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
  ) {
    super(message || `Chat API error (${status})`);
    this.name = 'ChatApiError';
  }
}

async function authorizedFetch(
  { getIdToken, apiBaseUrl }: ChatSessionConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getIdToken();
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json || !json.success) {
    const errBody = json && !json.success ? json.error : undefined;
    throw new ChatApiError(res.status, errBody?.code, errBody?.message ?? res.statusText);
  }
  return json.data;
}

async function fetchCurrentConversation(config: ChatSessionConfig): Promise<Conversation | null> {
  const res = await authorizedFetch(config, '/chat/conversations/current');
  // A 404 means "no open conversation yet" — an expected state, not an error.
  if (res.status === 404) return null;
  return unwrap<Conversation>(res);
}

async function fetchMessages(
  config: ChatSessionConfig,
  conversationId: string,
): Promise<ChatMessage[]> {
  const res = await authorizedFetch(
    config,
    `/chat/conversations/${conversationId}/messages?limit=50`,
  );
  return unwrap<ChatMessage[]>(res);
}

/** GET /chat/conversations/current — the customer's open conversation, if any. */
export function useCurrentConversationQuery(config: ChatSessionConfig) {
  return useQuery({
    queryKey: chatKeys.currentConversation(),
    queryFn: () => fetchCurrentConversation(config),
    staleTime: 30_000,
    retry: false,
  });
}

export interface UseMessagesQueryArgs extends ChatSessionConfig {
  conversationId: string | null | undefined;
  /** Only poll while the panel is open (SDD §3.4 — no background polling). */
  open: boolean;
}

/** GET /chat/conversations/{id}/messages — polls every 3s only while `open`. */
export function useMessagesQuery({ conversationId, open, ...config }: UseMessagesQueryArgs) {
  const key = chatKeys.messages(conversationId ?? PENDING_CONVERSATION_KEY);
  const enabled = open && Boolean(conversationId);
  return useQuery({
    queryKey: key,
    queryFn: () => fetchMessages(config, conversationId as string),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}

interface SendMessageVariables {
  text: string;
}

interface MutationContext {
  key: readonly ['chat', 'messages', string];
  previous: ChatMessage[] | undefined;
  optimisticId: string;
}

export interface UseSendMessageMutationArgs extends ChatSessionConfig {
  conversationId: string | null | undefined;
  locale: Locale;
}

/**
 * Sends a customer message — `POST /chat/conversations` for the first
 * message of a session, `POST /chat/conversations/{id}/messages` after.
 * Appends an optimistic customer bubble immediately and rolls it back on
 * error (UT-F03, UT-F05).
 */
export function useSendMessageMutation({
  conversationId,
  locale,
  ...config
}: UseSendMessageMutationArgs) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text }: SendMessageVariables) => {
      if (!conversationId) {
        const res = await authorizedFetch(config, '/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({ text, locale }),
        });
        const data = await unwrap<StartConversationResponse>(res);
        return { kind: 'start' as const, ...data };
      }
      const res = await authorizedFetch(config, `/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const data = await unwrap<SendMessageResponse>(res);
      return { kind: 'append' as const, ...data };
    },

    onMutate: async ({ text }): Promise<MutationContext> => {
      const key = chatKeys.messages(conversationId ?? PENDING_CONVERSATION_KEY);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChatMessage[]>(key);
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        role: 'customer',
        text,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), optimisticMessage]);
      return { key, previous, optimisticId };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData(context.key, context.previous);
    },

    onSuccess: (result, _vars, context) => {
      if (result.kind === 'start') {
        queryClient.setQueryData(chatKeys.currentConversation(), result.conversation);
        queryClient.setQueryData(chatKeys.messages(result.conversation.id), result.messages);
        if (context && context.key[2] !== result.conversation.id) {
          queryClient.removeQueries({ queryKey: context.key, exact: true });
        }
        return;
      }

      const key = chatKeys.messages(conversationId as string);
      queryClient.setQueryData<ChatMessage[]>(key, (old) => {
        const withoutOptimistic = (old ?? []).filter((m) => m.id !== context?.optimisticId);
        const next = [...withoutOptimistic, result.message];
        if (result.reply) next.push(result.reply);
        return next;
      });
      queryClient.setQueryData<Conversation | null | undefined>(
        chatKeys.currentConversation(),
        (old) =>
          old
            ? {
                ...old,
                lastMessageAt: result.message.createdAt,
                lastMessagePreview: result.message.text,
                messageCount: old.messageCount + (result.reply ? 2 : 1),
              }
            : old,
      );
    },
  });
}
