import { backofficeApi } from '@/api/backoffice';
import type { AuditEvent } from '@/api/types';
import { LocaleProvider } from '@/lib/i18n';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditActivityDialog } from './AuditActivityDialog';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    getUserActivity: vi.fn(),
  },
}));

const mockedApi = vi.mocked(backofficeApi);

const events: AuditEvent[] = [
  {
    id: 'evt-1',
    actorUID: 'uid-staff-1',
    actorEmail: 'staff@factorysyncsolutions.com',
    eventType: 'user_login',
    resourceType: 'session',
    resourceID: 'res-1',
    targetUID: 'uid-user-1',
    projectID: 'proj-1',
    metadata: { ip: '1.2.3.4' },
    createdAt: '2026-01-15T10:30:00Z',
  },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Harness({ initialOpen = true }: Readonly<{ initialOpen?: boolean }>) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <LocaleProvider>
      <AuditActivityDialog
        uid="uid-user-1"
        title="User Activity"
        description="Recent actions"
        open={open}
        onOpenChange={setOpen}
      />
    </LocaleProvider>
  );
}

describe('AuditActivityDialog', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not fetch or render dialog content when closed', () => {
    mockedApi.getUserActivity.mockResolvedValue([]);
    render(<Harness initialOpen={false} />);

    expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
    expect(mockedApi.getUserActivity).not.toHaveBeenCalled();
  });

  it('shows loading skeletons while the activity request is pending', async () => {
    const deferred = createDeferred<AuditEvent[]>();
    mockedApi.getUserActivity.mockReturnValue(deferred.promise);

    render(<Harness />);

    await waitFor(() => {
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    deferred.resolve(events);
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
  });

  it('fetches and renders events for the given uid when opened', async () => {
    mockedApi.getUserActivity.mockResolvedValue(events);

    render(<Harness />);

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('User Activity')).toBeInTheDocument();
    expect(screen.getByText('Recent actions')).toBeInTheDocument();
    expect(screen.getByText(/staff@factorysyncsolutions\.com/)).toBeInTheDocument();
    expect(screen.getByText(/uid-user-1/)).toBeInTheDocument();
    expect(screen.getByText(/proj-1/)).toBeInTheDocument();
    expect(screen.getByText(/ip: 1\.2\.3\.4/)).toBeInTheDocument();
    expect(mockedApi.getUserActivity).toHaveBeenCalledWith('uid-user-1');
  });

  it('falls back to the raw event type when there is no translation', async () => {
    mockedApi.getUserActivity.mockResolvedValue([
      { ...events[0], eventType: 'unknown.event.type' },
    ]);

    render(<Harness />);

    expect(await screen.findByText('unknown.event.type')).toBeInTheDocument();
  });

  it('shows the empty state when there are no events', async () => {
    mockedApi.getUserActivity.mockResolvedValue([]);

    render(<Harness />);

    expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedApi.getUserActivity.mockRejectedValue(new Error('network error'));

    render(<Harness />);

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('refetches events when the refresh button is clicked', async () => {
    mockedApi.getUserActivity.mockResolvedValue(events);

    render(<Harness />);
    await screen.findByText('Signed in');
    expect(mockedApi.getUserActivity).toHaveBeenCalledTimes(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() => expect(mockedApi.getUserActivity).toHaveBeenCalledTimes(2));
  });

  it('closes the dialog when the close control is activated', async () => {
    mockedApi.getUserActivity.mockResolvedValue(events);

    render(<Harness />);
    await screen.findByText('Signed in');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByText('User Activity')).not.toBeInTheDocument());
  });
});
