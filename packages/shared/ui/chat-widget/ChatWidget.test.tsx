import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatWidget, type ChatWidgetProps } from './ChatWidget';
import type { ChatMessage, Conversation } from './types';

/**
 * UT-F01..F07 from docs/product/ai-chatbot/test-plan.md §2.3. UT-F08 (polling
 * gated to panel-open) lives in useChatSession.test.tsx alongside the other
 * hook-level fake-timer assertions.
 */

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    channel: 'web-app',
    userID: 'user-1',
    status: 'bot',
    locale: 'en',
    lastMessageAt: '2026-07-03T10:00:00.000Z',
    lastMessagePreview: 'Hi there',
    messageCount: 2,
    createdAt: '2026-07-03T09:59:00.000Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'customer',
    text: 'Hi there',
    createdAt: '2026-07-03T09:59:30.000Z',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const notFoundResponse = () =>
  Promise.resolve(jsonResponse({ success: false, error: { code: 'NOT_FOUND' } }, 404));

function renderWidget(props: Partial<ChatWidgetProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const defaultProps: ChatWidgetProps = {
    getIdToken: async () => 'test-token',
    apiBaseUrl: 'https://api.test/v1',
    locale: 'en',
    ...props,
  };
  function Wrapper(): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ChatWidget {...defaultProps} />
      </QueryClientProvider>
    );
  }
  return { ...render(<Wrapper />), queryClient };
}

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(notFoundResponse));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('UT-F01 — renders the FAB closed, with the panel hidden and an aria-label present', () => {
    renderWidget();

    const fab = screen.getByRole('button', { name: 'Open chat with customer support' });
    expect(fab).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('UT-F02 — panel opens and loads history in chronological order', async () => {
    const conversation = makeConversation();
    const messages = [
      makeMessage({ id: 'm1', role: 'customer', text: 'Hi there' }),
      makeMessage({ id: 'm2', role: 'bot', text: 'Hello! How can I help?' }),
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const url = input;
        if (url.includes('/conversations/current')) {
          return Promise.resolve(jsonResponse({ success: true, data: conversation }));
        }
        if (url.includes('/messages')) {
          return Promise.resolve(jsonResponse({ success: true, data: messages, meta: {} }));
        }
        return notFoundResponse();
      }),
    );

    renderWidget();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open chat with customer support' }));

    const list = screen.getByRole('list', { name: 'FactorySync Support' });
    await waitFor(() => expect(within(list).getByText('Hi there')).toBeInTheDocument());
    const first = within(list).getByText('Hi there');
    const second = within(list).getByText('Hello! How can I help?');
    // First message must precede the second in document order (chronological render).
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('UT-F03 — sending appends the customer bubble optimistically, then the bot reply', async () => {
    let resolvePost!: (res: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = input;
        if (url.includes('/conversations/current')) return notFoundResponse();
        if (url.endsWith('/chat/conversations') && init?.method === 'POST') return postPromise;
        return notFoundResponse();
      }),
    );

    renderWidget();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open chat with customer support' }));

    const input = screen.getByLabelText('Type your message…');
    await user.type(input, 'What services do you offer?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // Optimistic customer bubble renders immediately, before the network call resolves.
    expect(await screen.findByText('What services do you offer?')).toBeInTheDocument();
    expect(screen.queryByText('We offer factory health checks.')).not.toBeInTheDocument();

    resolvePost(
      jsonResponse({
        success: true,
        data: {
          conversation: makeConversation(),
          messages: [
            makeMessage({ id: 'm1', role: 'customer', text: 'What services do you offer?' }),
            makeMessage({ id: 'm2', role: 'bot', text: 'We offer factory health checks.' }),
          ],
        },
      }),
    );

    expect(await screen.findByText('We offer factory health checks.')).toBeInTheDocument();
  });

  it('UT-F04 — shows a typing indicator while the send mutation is in flight', async () => {
    let resolvePost!: (res: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = input;
        if (url.includes('/conversations/current')) return notFoundResponse();
        if (url.endsWith('/chat/conversations') && init?.method === 'POST') return postPromise;
        return notFoundResponse();
      }),
    );

    renderWidget();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open chat with customer support' }));
    await user.type(screen.getByLabelText('Type your message…'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Typing…')).toBeInTheDocument();

    resolvePost(
      jsonResponse({
        success: true,
        data: {
          conversation: makeConversation(),
          messages: [makeMessage({ id: 'm1', text: 'Hello' })],
        },
      }),
    );

    await waitFor(() => expect(screen.queryByText('Typing…')).not.toBeInTheDocument());
  });

  it('UT-F05 — shows a bilingual error notice on send failure and allows retry', async () => {
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      const url = input;
      if (url.includes('/conversations/current')) return notFoundResponse();
      if (url.endsWith('/chat/conversations') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ success: false, error: { code: 'INTERNAL' } }, 500));
      }
      return notFoundResponse();
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWidget();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open chat with customer support' }));
    const input = screen.getByLabelText('Type your message…');
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    // Input is re-enabled after the failed send.
    expect(screen.getByLabelText('Type your message…')).not.toBeDisabled();

    const postCallsBeforeRetry = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    ).length;

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      const postCallsAfterRetry = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
      ).length;
      expect(postCallsAfterRetry).toBeGreaterThan(postCallsBeforeRetry);
    });
  });

  it('UT-F06 — blocks empty and overlong input without calling the API', async () => {
    const fetchMock = vi.fn((_input: string, _init?: RequestInit) => notFoundResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderWidget();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open chat with customer support' }));

    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    const input = screen.getByLabelText('Type your message…');
    const overlong = 'a'.repeat(4001);
    // Programmatic value assignment bypasses the native maxLength clamp, exercising
    // the JS-side validation path (UT-F06's ">4,000 chars" case).
    await user.click(input);
    await user.paste(overlong);

    expect(screen.getByText('Message is too long (4,000 characters max)')).toBeInTheDocument();
    expect(sendButton).toBeDisabled();

    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCalls).toHaveLength(0);
  });

  it('UT-F07 — chrome strings switch with locale, no hardcoded text', () => {
    const th = renderWidget({ locale: 'th' });
    expect(screen.getByRole('button', { name: 'เปิดแชทกับฝ่ายบริการลูกค้า' })).toBeInTheDocument();
    th.unmount();

    renderWidget({ locale: 'en' });
    expect(
      screen.getByRole('button', { name: 'Open chat with customer support' }),
    ).toBeInTheDocument();
  });
});
