export { ChatWidget, type ChatWidgetProps } from './ChatWidget';
export { createChatTranslator, type ChatTranslator } from './i18n';
export type {
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  ChatChannel,
  ChatMessage,
  Conversation,
  ConversationStatus,
  ListMessagesMeta,
  Locale as ChatLocale,
  MessageRole,
  SendMessageRequest,
  SendMessageResponse,
  StartConversationRequest,
  StartConversationResponse,
} from './types';
export {
  ChatApiError,
  chatKeys,
  useCurrentConversationQuery,
  useMessagesQuery,
  useSendMessageMutation,
  type ChatSessionConfig,
  type UseMessagesQueryArgs,
  type UseSendMessageMutationArgs,
} from './useChatSession';
