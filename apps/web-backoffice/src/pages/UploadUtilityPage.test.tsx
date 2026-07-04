// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadUtilityPage } from './UploadUtilityPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    uploadFile: vi.fn(),
  },
}));

// Avoid pulling in @/lib/firebase (initializeApp/getAuth) transitively via
// @/lib/api — this app has no Firebase test config, so that import throws.
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

function renderPage() {
  return render(
    <LocaleProvider>
      <UploadUtilityPage />
    </LocaleProvider>,
  );
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('UploadUtilityPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  it('uploads a chosen file and shows its CDN link', async () => {
    mockedBackofficeApi.uploadFile.mockResolvedValue({
      fileURL: 'https://cdn.example.com/uploads/abc/abc.png',
      originalFilename: 'screenshot.png',
      contentType: 'image/png',
      fileSizeBytes: 2048,
    });

    renderPage();

    const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
    selectFile(file);

    await waitFor(() => {
      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    });
    expect(mockedBackofficeApi.uploadFile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('shows an error message when the upload fails', async () => {
    mockedBackofficeApi.uploadFile.mockRejectedValue(new Error('server exploded'));

    renderPage();

    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });
    selectFile(file);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('rejects an oversized file client-side without calling the API', async () => {
    renderPage();

    const oversized = new File([new Uint8Array(51 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    });
    selectFile(oversized);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
    expect(mockedBackofficeApi.uploadFile).not.toHaveBeenCalled();
  });
});
