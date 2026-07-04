import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultsPage } from './ResultsPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listResults: vi.fn(),
    exportCSV: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

const result = {
  id: 'result-1',
  uid: 'uid-1',
  quizId: 'quiz-factory',
  scores: [{ dimensionID: 'd1', dimensionName: 'Safety', score: 4.2 }],
  overallScore: 4.2,
  strengths: ['Strong leadership'],
  weaknesses: ['Slow maintenance'],
  diagnosis: 'Advanced',
  submittedAt: '2026-06-01T00:00:00Z',
  companyName: 'Acme Co',
  industryType: 'manufacturing',
  companySize: 'medium',
  contactName: '',
  contactEmail: '',
  projectID: 'proj-1',
};

function renderPage() {
  return render(
    <LocaleProvider>
      <ResultsPage />
    </LocaleProvider>,
  );
}

describe('ResultsPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders results once loaded', async () => {
    mockedBackofficeApi.listResults.mockResolvedValue([result]);

    renderPage();

    expect(await screen.findByText('Acme Co')).toBeInTheDocument();
    expect(screen.getByText('4.20')).toBeInTheDocument();
  });

  it('shows the empty state when there are no results', async () => {
    mockedBackofficeApi.listResults.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.listResults.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('expands a row to show dimension scores and strengths/weaknesses', async () => {
    mockedBackofficeApi.listResults.mockResolvedValue([result]);

    renderPage();
    const toggle = await screen.findByRole('button', { name: /acme co/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Strong leadership')).toBeInTheDocument();
    expect(screen.getByText('Slow maintenance')).toBeInTheDocument();
  });

  it('exports a CSV file when the export button is clicked', async () => {
    mockedBackofficeApi.listResults.mockResolvedValue([result]);
    const blob = new Blob(['csv-data'], { type: 'text/csv' });
    mockedBackofficeApi.exportCSV.mockResolvedValue({
      blob: () => Promise.resolve(blob),
    } as unknown as Response);
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    // jsdom attempts a real page navigation on anchor.click() since the anchor
    // is never attached to the document — stub it out like a real download.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    await screen.findByText('Acme Co');

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.exportCSV).toHaveBeenCalledOnce();
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows an error message when the export fails', async () => {
    mockedBackofficeApi.listResults.mockResolvedValue([result]);
    mockedBackofficeApi.exportCSV.mockRejectedValue(new Error('export failed'));

    renderPage();
    await screen.findByText('Acme Co');

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
