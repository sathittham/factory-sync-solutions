import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditPage } from './AuditPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listAudit: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

function renderPage() {
  return render(
    <LocaleProvider>
      <AuditPage />
    </LocaleProvider>,
  );
}

describe('AuditPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders audit events once loaded', async () => {
    mockedBackofficeApi.listAudit.mockResolvedValue([
      {
        id: 'evt-1',
        actorUID: 'uid-actor-1',
        actorEmail: 'actor@factorysyncsolutions.com',
        eventType: 'user.login',
        resourceType: 'profile',
        resourceID: 'uid-actor-1',
        createdAt: '2026-06-01T08:00:00Z',
      },
    ]);

    renderPage();

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('actor@factorysyncsolutions.com')).toBeInTheDocument();
    expect(mockedBackofficeApi.listAudit).toHaveBeenCalledWith({ limit: 100 });
  });

  it('falls back to the raw event type when there is no translation', async () => {
    mockedBackofficeApi.listAudit.mockResolvedValue([
      {
        id: 'evt-2',
        actorUID: 'uid-actor-2',
        eventType: 'some.unmapped_event',
        resourceType: 'profile',
        resourceID: 'uid-actor-2',
        createdAt: '2026-06-01T08:00:00Z',
      },
    ]);

    renderPage();

    expect(await screen.findByText('some.unmapped_event')).toBeInTheDocument();
  });

  it('shows the empty state when there are no events', async () => {
    mockedBackofficeApi.listAudit.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.listAudit.mockRejectedValue(new Error('server error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('applies the actor UID filter and refetches with it', async () => {
    mockedBackofficeApi.listAudit.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(mockedBackofficeApi.listAudit).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Actor UID'), {
      target: { value: 'uid-actor-9' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.listAudit).toHaveBeenCalledWith({
        limit: 100,
        actorUID: 'uid-actor-9',
      });
    });
  });

  it('resets filters back to the default', async () => {
    mockedBackofficeApi.listAudit.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(mockedBackofficeApi.listAudit).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Actor UID'), {
      target: { value: 'uid-actor-9' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.listAudit).toHaveBeenLastCalledWith({ limit: 100 });
    });
    expect(screen.getByPlaceholderText('Actor UID')).toHaveValue('');
  });
});
