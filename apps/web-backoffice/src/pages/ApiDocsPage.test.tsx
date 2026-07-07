// @vitest-environment jsdom

import type { OpenApiSpec } from '@/api/types';
import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiDocsPage } from './ApiDocsPage';

vi.mock('swagger-ui-react', () => ({
  default: ({ spec }: { spec: OpenApiSpec }) => (
    <div data-testid="swagger-ui">{spec.info?.title || 'Swagger UI'}</div>
  ),
}));

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listApiDocVersions: vi.fn(),
    getApiDocsMetadata: vi.fn(),
    getApiDocsJson: vi.fn(),
    getApiDocsYaml: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

function renderPage() {
  return render(
    <LocaleProvider>
      <ApiDocsPage />
    </LocaleProvider>,
  );
}

describe('ApiDocsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  it('renders metadata, downloads, and Swagger UI after loading docs', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({
      versions: [{ apiVersion: 'v1', label: 'API v1', isCurrent: true }],
    });
    mockedBackofficeApi.getApiDocsMetadata.mockResolvedValue({
      environment: 'staging',
      apiVersion: 'v1',
      gitSHA: 'abc123def4567890',
      generatedAt: '2026-06-14T08:00:00Z',
      openapiVersion: '2.0',
      jsonKey: 'openapi/v1/current/swagger.json',
      yamlKey: 'openapi/v1/current/swagger.yaml',
    });
    mockedBackofficeApi.getApiDocsJson.mockResolvedValue({
      spec: {
        swagger: '2.0',
        info: { title: 'FactorySync Solutions API', version: 'v1' },
        paths: {},
      },
    });
    mockedBackofficeApi.getApiDocsYaml.mockResolvedValue({
      yaml: 'swagger: "2.0"\ninfo:\n  title: FactorySync Solutions API\n',
    });

    renderPage();

    expect(await screen.findByTestId('swagger-ui')).toHaveTextContent('FactorySync Solutions API');
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('abc123def456')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download json/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /download yaml/i })).toBeEnabled();
  });

  it('shows the local generation command when artifacts are missing', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({
      versions: [{ apiVersion: 'v1', label: 'API v1', isCurrent: true }],
    });
    mockedBackofficeApi.getApiDocsMetadata.mockRejectedValue(new Error('api docs not found'));
    mockedBackofficeApi.getApiDocsJson.mockRejectedValue(new Error('api docs not found'));
    mockedBackofficeApi.getApiDocsYaml.mockRejectedValue(new Error('api docs not found'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/run make docs-api from the repo root/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('swagger-ui')).not.toBeInTheDocument();
  });

  it('shows a generic error when listing API doc versions fails', async () => {
    mockedBackofficeApi.listApiDocVersions.mockRejectedValue(new Error('network down'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/run make docs-api from the repo root/i)).not.toBeInTheDocument();
  });

  it('falls back to the first version when none is marked current', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({
      versions: [
        { apiVersion: 'v1', label: 'API v1', isCurrent: false },
        { apiVersion: 'v2', label: 'API v2', isCurrent: false },
      ],
    });
    mockedBackofficeApi.getApiDocsMetadata.mockResolvedValue({
      environment: 'staging',
      apiVersion: 'v1',
      gitSHA: 'abc123def4567890',
      generatedAt: '2026-06-14T08:00:00Z',
      openapiVersion: '2.0',
      jsonKey: 'openapi/v1/current/swagger.json',
      yamlKey: 'openapi/v1/current/swagger.yaml',
    });
    mockedBackofficeApi.getApiDocsJson.mockResolvedValue({
      spec: {
        swagger: '2.0',
        info: { title: 'FactorySync Solutions API', version: 'v1' },
        paths: {},
      },
    });
    mockedBackofficeApi.getApiDocsYaml.mockResolvedValue({ yaml: 'swagger: "2.0"\n' });

    renderPage();

    await waitFor(() => {
      expect(mockedBackofficeApi.getApiDocsMetadata).toHaveBeenCalledWith('v1');
    });
  });

  it('shows no data and skips fetching docs when the version list is empty', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({ versions: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
    expect(mockedBackofficeApi.getApiDocsMetadata).not.toHaveBeenCalled();
  });

  it('reloads the current docs when Refresh is clicked', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({
      versions: [{ apiVersion: 'v1', label: 'API v1', isCurrent: true }],
    });
    mockedBackofficeApi.getApiDocsMetadata.mockResolvedValue({
      environment: 'staging',
      apiVersion: 'v1',
      gitSHA: 'abc123def4567890',
      generatedAt: '2026-06-14T08:00:00Z',
      openapiVersion: '2.0',
      jsonKey: 'openapi/v1/current/swagger.json',
      yamlKey: 'openapi/v1/current/swagger.yaml',
    });
    mockedBackofficeApi.getApiDocsJson.mockResolvedValue({
      spec: {
        swagger: '2.0',
        info: { title: 'FactorySync Solutions API', version: 'v1' },
        paths: {},
      },
    });
    mockedBackofficeApi.getApiDocsYaml.mockResolvedValue({ yaml: 'swagger: "2.0"\n' });

    renderPage();
    await screen.findByTestId('swagger-ui');

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.getApiDocsMetadata).toHaveBeenCalledTimes(2);
    });
  });

  it('downloads the JSON and YAML specs', async () => {
    mockedBackofficeApi.listApiDocVersions.mockResolvedValue({
      versions: [{ apiVersion: 'v1', label: 'API v1', isCurrent: true }],
    });
    mockedBackofficeApi.getApiDocsMetadata.mockResolvedValue({
      environment: 'staging',
      apiVersion: 'v1',
      gitSHA: 'abc123def4567890',
      generatedAt: '2026-06-14T08:00:00Z',
      openapiVersion: '2.0',
      jsonKey: 'openapi/v1/current/swagger.json',
      yamlKey: 'openapi/v1/current/swagger.yaml',
    });
    mockedBackofficeApi.getApiDocsJson.mockResolvedValue({
      spec: {
        swagger: '2.0',
        info: { title: 'FactorySync Solutions API', version: 'v1' },
        paths: {},
      },
    });
    mockedBackofficeApi.getApiDocsYaml.mockResolvedValue({ yaml: 'swagger: "2.0"\n' });

    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    await screen.findByTestId('swagger-ui');

    fireEvent.click(screen.getByRole('button', { name: /download json/i }));
    fireEvent.click(screen.getByRole('button', { name: /download yaml/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);

    clickSpy.mockRestore();
  });
});
