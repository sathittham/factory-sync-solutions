import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    getStats: vi.fn(),
    listResults: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

function renderPage() {
  return render(
    <LocaleProvider>
      <DashboardPage />
    </LocaleProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders stat cards and recent results after loading', async () => {
    mockedBackofficeApi.getStats.mockResolvedValue({
      totalProjects: 12,
      totalUsers: 340,
      avgScore: 3.456,
      staffCount: 5,
    });
    mockedBackofficeApi.listResults.mockResolvedValue([
      {
        id: 'r1',
        uid: 'uid-1',
        quizId: 'quiz-factory',
        scores: [],
        overallScore: 3.5,
        strengths: [],
        weaknesses: [],
        diagnosis: 'Developing',
        submittedAt: '2026-06-01T00:00:00Z',
        companyName: 'Acme Co',
        industryType: 'manufacturing',
        companySize: 'medium',
        contactName: '',
        contactEmail: '',
        projectID: 'proj-1',
      },
    ]);

    renderPage();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByText('3.46')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Acme Co')).toBeInTheDocument();
    expect(screen.getByText('quiz-factory')).toBeInTheDocument();
  });

  it('shows the empty state when there are no recent results', async () => {
    mockedBackofficeApi.getStats.mockResolvedValue({
      totalProjects: 0,
      totalUsers: 0,
      avgScore: 0,
      staffCount: 0,
    });
    mockedBackofficeApi.listResults.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.getStats.mockRejectedValue(new Error('network down'));
    mockedBackofficeApi.listResults.mockRejectedValue(new Error('network down'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
