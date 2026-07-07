import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createChatTranslator } from './i18n';
import type { ChatMessage, Locale } from './types';
import {
  useCurrentConversationQuery,
  useMessagesQuery,
  useSendMessageMutation,
} from './useChatSession';
import { useFocusTrap } from './useFocusTrap';

/**
 * Floating support-chat widget (SDD §3.4 / §5.2). Host-agnostic: no
 * dependency on either app's shadcn/ui, Redux, or `useLocale()` — everything
 * needed is passed in as props, and the widget carries its own small i18n
 * dictionary (`./i18n.ts`). Styled with plain Tailwind utility classes
 * (design-token-compatible: `bg-background`, `text-foreground`, …) following
 * the precedent set by `@shared/ui/DebugPanel`.
 *
 *   <ChatWidget
 *     getIdToken={() => auth.currentUser!.getIdToken()}
 *     apiBaseUrl={apiBaseUrl}
 *     locale={locale}
 *   />
 */

export interface ChatWidgetProps {
  /** Resolves a fresh Firebase ID token for each request. */
  getIdToken: () => Promise<string>;
  apiBaseUrl: string;
  locale: Locale;
  /** web-official only — omit for authenticated hosts like web-app. */
  getTurnstileToken?: () => Promise<string>;
}

type Translator = (key: string) => string;

const MAX_MESSAGE_LENGTH = 4000;

function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}

function ChatBubbleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function roleLabelKey(role: ChatMessage['role']): string {
  if (role === 'customer') return 'role.customer';
  if (role === 'agent') return 'role.agent';
  return 'role.bot';
}

function MessageBubble({ message, t }: Readonly<{ message: ChatMessage; t: Translator }>) {
  const isCustomer = message.role === 'customer';
  return (
    <li className={cx('flex flex-col gap-0.5', isCustomer ? 'items-end' : 'items-start')}>
      <span className="sr-only">{t(roleLabelKey(message.role))}</span>
      <div
        className={cx(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-base leading-snug',
          isCustomer
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {message.text}
      </div>
    </li>
  );
}

function TypingIndicator({ t }: Readonly<{ t: Translator }>) {
  return (
    <li className="flex items-start" aria-hidden="true">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5">
        <span className="sr-only">{t('typing.indicator')}</span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </li>
  );
}

function ChatFab({
  isOpen,
  hasUnread,
  onToggle,
  t,
}: Readonly<{ isOpen: boolean; hasUnread: boolean; onToggle: () => void; t: Translator }>) {
  const showUnreadDot = hasUnread && !isOpen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? t('fab.close') : t('fab.open')}
      aria-expanded={isOpen}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
      {showUnreadDot && (
        <span
          className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-destructive"
          aria-hidden="true"
        />
      )}
      {showUnreadDot && <span className="sr-only">{t('fab.unread')}</span>}
    </button>
  );
}

function EscalationBanner({ show, t }: Readonly<{ show: boolean; t: Translator }>) {
  if (!show) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="status" fits better than <output> here
    <div
      role="status"
      className="shrink-0 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
    >
      {t('banner.escalated')}
    </div>
  );
}

interface ChatMessageListProps {
  title: string;
  messages: ChatMessage[];
  isLoading: boolean;
  showEmptyState: boolean;
  isTyping: boolean;
  t: Translator;
}

function ChatMessageList({
  title,
  messages,
  isLoading,
  showEmptyState,
  isTyping,
  t,
}: Readonly<ChatMessageListProps>) {
  return (
    <ul aria-label={title} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {isLoading && (
        <li className="text-center text-sm text-muted-foreground">{t('state.loading')}</li>
      )}
      {showEmptyState && !isLoading && (
        <li className="mt-6 text-center">
          <p className="text-base font-medium">{t('empty.title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('empty.desc')}</p>
        </li>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} t={t} />
      ))}
      {isTyping && <TypingIndicator t={t} />}
    </ul>
  );
}

function SendErrorNotice({
  show,
  onRetry,
  t,
}: Readonly<{ show: boolean; onRetry: () => void; t: Translator }>) {
  if (!show) return null;
  return (
    <div
      role="alert"
      className="mx-4 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <span>{t('error.notice')}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md border border-destructive/40 px-2 py-1 text-sm font-medium hover:bg-destructive/10"
      >
        {t('error.retry')}
      </button>
    </div>
  );
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onSubmitNow: () => void;
  disabled: boolean;
  isOverLimit: boolean;
  isSendDisabled: boolean;
  t: Translator;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

function ChatComposer({
  value,
  onChange,
  onSubmit,
  onSubmitNow,
  disabled,
  isOverLimit,
  isSendDisabled,
  t,
  inputRef,
}: Readonly<ChatComposerProps>) {
  return (
    <form onSubmit={onSubmit} className="shrink-0 border-t border-border p-3">
      <div className="flex items-end gap-2">
        <label htmlFor="chat-widget-input" className="sr-only">
          {t('input.placeholder')}
        </label>
        <textarea
          id="chat-widget-input"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            e.preventDefault();
            onSubmitNow();
          }}
          placeholder={t('input.placeholder')}
          disabled={disabled}
          rows={1}
          aria-invalid={isOverLimit}
          className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSendDisabled}
          aria-label={t('input.send')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </div>
      {isOverLimit && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {t('input.tooLong')}
        </p>
      )}
    </form>
  );
}

/** Tracks bot/agent replies that arrive while the panel is closed (for the FAB's unread dot) and
 * drives the aria-live announcement region. Polling only happens while `isOpen` (SDD §3.4), so
 * this is the only signal available before the panel is reopened. */
function useUnreadTracking(messages: ChatMessage[], isOpen: boolean) {
  const [hasUnread, setHasUnread] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const previousMessageCount = useRef(0);

  useEffect(() => {
    const last = messages[messages.length - 1];
    const isNewIncoming =
      messages.length > previousMessageCount.current && last && last.role !== 'customer';
    if (!isOpen && isNewIncoming) {
      setHasUnread(true);
      setLiveAnnouncement(last.text);
    }
    previousMessageCount.current = messages.length;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHasUnread(false);
    const last = messages[messages.length - 1];
    if (last && last.role !== 'customer') setLiveAnnouncement(last.text);
  }, [isOpen, messages]);

  return { hasUnread, liveAnnouncement };
}

export function ChatWidget({
  getIdToken,
  apiBaseUrl,
  locale,
  getTurnstileToken: _getTurnstileToken,
}: Readonly<ChatWidgetProps>) {
  const t = useMemo(() => createChatTranslator(locale), [locale]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastSubmittedText, setLastSubmittedText] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversationQuery = useCurrentConversationQuery({ getIdToken, apiBaseUrl });
  const conversation = conversationQuery.data ?? null;
  const conversationId = conversation?.id ?? null;

  const messagesQuery = useMessagesQuery({
    getIdToken,
    apiBaseUrl,
    conversationId,
    open: isOpen,
  });
  const messages = messagesQuery.data ?? [];

  const sendMutation = useSendMessageMutation({ getIdToken, apiBaseUrl, locale, conversationId });

  const { hasUnread, liveAnnouncement } = useUnreadTracking(messages, isOpen);
  useFocusTrap(isOpen, panelRef, () => setIsOpen(false));

  const isHandedOff = conversation?.status === 'human' || conversation?.status === 'escalated';
  const statusLine = isHandedOff ? t('header.statusHuman') : t('header.statusBot');
  const trimmedLength = inputValue.trim().length;
  const isOverLimit = inputValue.length > MAX_MESSAGE_LENGTH;
  const isSendDisabled = trimmedLength === 0 || isOverLimit || sendMutation.isPending;
  const showEmptyState = messages.length === 0 && !sendMutation.isPending;

  function submitMessage() {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || sendMutation.isPending) return;
    setLastSubmittedText(trimmed);
    setInputValue('');
    sendMutation.mutate({ text: trimmed });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  function handleRetry() {
    if (!lastSubmittedText) return;
    sendMutation.mutate({ text: lastSubmittedText });
  }

  return (
    <>
      <ChatFab isOpen={isOpen} hasUnread={hasUnread} onToggle={() => setIsOpen((v) => !v)} t={t} />

      {isOpen && (
        <div
          ref={panelRef}
          // biome-ignore lint/a11y/useSemanticElements: native <dialog> is disallowed by project UI rules (CLAUDE.md)
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
          tabIndex={-1}
          className={cx(
            'fixed inset-0 z-40 flex flex-col bg-background text-foreground',
            'sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[32rem] sm:w-96 sm:rounded-xl sm:border sm:border-border sm:shadow-2xl',
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{t('title')}</h2>
              <p className="truncate text-sm text-muted-foreground">{statusLine}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t('fab.close')}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <CloseIcon />
            </button>
          </header>

          <EscalationBanner show={isHandedOff} t={t} />

          <div aria-live="polite" className="sr-only">
            {liveAnnouncement}
          </div>

          <ChatMessageList
            title={t('title')}
            messages={messages}
            isLoading={conversationQuery.isLoading}
            showEmptyState={showEmptyState}
            isTyping={sendMutation.isPending}
            t={t}
          />

          <SendErrorNotice show={sendMutation.isError} onRetry={handleRetry} t={t} />

          <ChatComposer
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onSubmitNow={submitMessage}
            disabled={sendMutation.isPending}
            isOverLimit={isOverLimit}
            isSendDisabled={isSendDisabled}
            t={t}
            inputRef={inputRef}
          />
        </div>
      )}
    </>
  );
}
