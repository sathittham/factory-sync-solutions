// @vitest-environment jsdom

import type { AnalyticsRange } from '@/api/types';
import { LocaleProvider, useLocale } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebAnalyticsSection } from './WebAnalyticsSection';
import {
  audienceFixture,
  channelsFixture,
  engagementFixture,
  metaFixture,
  overviewFixture,
  sourcesFixture,
  topPagesFixture,
} from './analyticsTestFixtures';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    getAnalyticsOverview: vi.fn(),
    getAnalyticsTopPages: vi.fn(),
    getAnalyticsChannels: vi.fn(),
    getAnalyticsAudience: vi.fn(),
    getAnalyticsEngagement: vi.fn(),
    getAnalyticsSources: vi.fn(),
    getAnalyticsMeta: vi.fn(),
  },
}));

// recharts' ResponsiveContainer measures its DOM node via ResizeObserver, which
// jsdom does not implement. Render the chart with explicit pixel dimensions
// instead so the real chart primitives can mount without a layout engine.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 800, height: 300 }),
  };
});

const { backofficeApi } = await import('@/api/backoffice');
const mockedApi = vi.mocked(backofficeApi);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function resolveAllWithFixtures(range: AnalyticsRange = '28d') {
  mockedApi.getAnalyticsOverview.mockResolvedValue({ ...overviewFixture, range });
  mockedApi.getAnalyticsTopPages.mockResolvedValue({ ...topPagesFixture, range });
  mockedApi.getAnalyticsChannels.mockResolvedValue({ ...channelsFixture, range });
  mockedApi.getAnalyticsAudience.mockResolvedValue({ ...audienceFixture, range });
  mockedApi.getAnalyticsEngagement.mockResolvedValue({ ...engagementFixture, range });
  mockedApi.getAnalyticsSources.mockResolvedValue({ ...sourcesFixture, range });
  mockedApi.getAnalyticsMeta.mockResolvedValue(metaFixture);
}

function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button type="button" onClick={() => setLocale(locale === 'en' ? 'th' : 'en')}>
      toggle-locale
    </button>
  );
}

function renderSection(children: ReactNode = <WebAnalyticsSection />) {
  return render(
    <LocaleProvider>
      <LocaleToggle />
      {children}
    </LocaleProvider>,
  );
}

async function waitForInitialLoad() {
  expect(await screen.findByText('1,843')).toBeInTheDocument();
}

describe('WebAnalyticsSection', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture / scrollIntoView, which the
    // Radix Select primitive relies on when opening its listbox via userEvent.
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading skeletons for every panel and then renders success data across all four panels (UT-F01)', async () => {
    const deferred = createDeferred<typeof overviewFixture>();
    mockedApi.getAnalyticsOverview.mockReturnValue(deferred.promise);
    mockedApi.getAnalyticsTopPages.mockResolvedValue(topPagesFixture);
    mockedApi.getAnalyticsChannels.mockResolvedValue(channelsFixture);
    mockedApi.getAnalyticsAudience.mockResolvedValue(audienceFixture);
    mockedApi.getAnalyticsEngagement.mockResolvedValue(engagementFixture);
    mockedApi.getAnalyticsSources.mockResolvedValue(sourcesFixture);
    mockedApi.getAnalyticsMeta.mockResolvedValue(metaFixture);

    const { container } = renderSection();

    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('1,843')).not.toBeInTheDocument();

    deferred.resolve(overviewFixture);

    await waitForInitialLoad();
    expect(screen.getByRole('heading', { name: 'Active Users' })).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Organic Search')).toBeInTheDocument();
    expect(screen.getByText('Thailand')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DAU' })).toBeInTheDocument();
    expect(screen.getByText('google / organic')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);

    expect(mockedApi.getAnalyticsOverview).toHaveBeenCalledWith('28d', 'all');
    expect(mockedApi.getAnalyticsTopPages).toHaveBeenCalledWith('28d', 'all');
    expect(mockedApi.getAnalyticsChannels).toHaveBeenCalledWith('28d', 'all');
    expect(mockedApi.getAnalyticsAudience).toHaveBeenCalledWith('28d', 'all');
    expect(mockedApi.getAnalyticsEngagement).toHaveBeenCalledWith('28d', 'all');
    expect(mockedApi.getAnalyticsSources).toHaveBeenCalledWith('28d', 'all');
  });

  it('shows a per-panel inline error without blanking the panels that succeeded (UT-F02)', async () => {
    mockedApi.getAnalyticsOverview.mockRejectedValue(new Error('upstream unavailable'));
    mockedApi.getAnalyticsTopPages.mockResolvedValue(topPagesFixture);
    mockedApi.getAnalyticsChannels.mockResolvedValue(channelsFixture);
    mockedApi.getAnalyticsAudience.mockResolvedValue(audienceFixture);
    mockedApi.getAnalyticsEngagement.mockResolvedValue(engagementFixture);
    mockedApi.getAnalyticsSources.mockResolvedValue(sourcesFixture);
    mockedApi.getAnalyticsMeta.mockResolvedValue(metaFixture);

    renderSection();

    expect(
      await screen.findByText('Analytics is temporarily unavailable. Please try again.'),
    ).toBeInTheDocument();

    // the other panels still render their data, unaffected by the overview failure
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Organic Search')).toBeInTheDocument();
    expect(screen.getByText('Thailand')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DAU' })).toBeInTheDocument();

    // section-level retry surfaces because at least one panel errored
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('refetches every panel with the newly selected range and shows loading states while pending (UT-F03)', async () => {
    resolveAllWithFixtures('28d');

    const { container } = renderSection();
    await waitForInitialLoad();

    expect(mockedApi.getAnalyticsOverview).toHaveBeenCalledTimes(1);
    expect(mockedApi.getAnalyticsOverview).toHaveBeenLastCalledWith('28d', 'all');

    const deferred = createDeferred<typeof overviewFixture>();
    mockedApi.getAnalyticsOverview.mockReturnValue(deferred.promise);
    mockedApi.getAnalyticsTopPages.mockResolvedValue({ ...topPagesFixture, range: '7d' });
    mockedApi.getAnalyticsChannels.mockResolvedValue({ ...channelsFixture, range: '7d' });
    mockedApi.getAnalyticsAudience.mockResolvedValue({ ...audienceFixture, range: '7d' });
    mockedApi.getAnalyticsEngagement.mockResolvedValue({ ...engagementFixture, range: '7d' });
    mockedApi.getAnalyticsSources.mockResolvedValue({ ...sourcesFixture, range: '7d' });

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Last 7 days' }));

    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    deferred.resolve({ ...overviewFixture, range: '7d' });

    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    });

    expect(mockedApi.getAnalyticsOverview).toHaveBeenLastCalledWith('7d', 'all');
    expect(mockedApi.getAnalyticsTopPages).toHaveBeenLastCalledWith('7d', 'all');
    expect(mockedApi.getAnalyticsChannels).toHaveBeenLastCalledWith('7d', 'all');
    expect(mockedApi.getAnalyticsAudience).toHaveBeenLastCalledWith('7d', 'all');
    expect(mockedApi.getAnalyticsEngagement).toHaveBeenLastCalledWith('7d', 'all');
    expect(mockedApi.getAnalyticsSources).toHaveBeenLastCalledWith('7d', 'all');
  });

  it('refetches every panel with the selected site when a site tab is clicked (UT-F11)', async () => {
    resolveAllWithFixtures('28d');

    renderSection();
    await waitForInitialLoad();

    expect(mockedApi.getAnalyticsOverview).toHaveBeenLastCalledWith('28d', 'all');

    const user = userEvent.setup();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Official website' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Web app' }));

    await waitFor(() => {
      expect(mockedApi.getAnalyticsOverview).toHaveBeenLastCalledWith('28d', 'app');
    });
    expect(mockedApi.getAnalyticsTopPages).toHaveBeenLastCalledWith('28d', 'app');
    expect(mockedApi.getAnalyticsChannels).toHaveBeenLastCalledWith('28d', 'app');
    expect(mockedApi.getAnalyticsAudience).toHaveBeenLastCalledWith('28d', 'app');
    expect(mockedApi.getAnalyticsEngagement).toHaveBeenLastCalledWith('28d', 'app');
    expect(mockedApi.getAnalyticsSources).toHaveBeenLastCalledWith('28d', 'app');
  });

  it('shows a retry-able stale warning while keeping all sections visible (UT-F07)', async () => {
    mockedApi.getAnalyticsOverview.mockResolvedValue({ ...overviewFixture, stale: true });
    mockedApi.getAnalyticsTopPages.mockResolvedValue(topPagesFixture);
    mockedApi.getAnalyticsChannels.mockResolvedValue(channelsFixture);
    mockedApi.getAnalyticsAudience.mockResolvedValue(audienceFixture);
    mockedApi.getAnalyticsEngagement.mockResolvedValue(engagementFixture);
    mockedApi.getAnalyticsSources.mockResolvedValue(sourcesFixture);
    mockedApi.getAnalyticsMeta.mockResolvedValue(metaFixture);

    renderSection();
    await waitForInitialLoad();

    expect(
      screen.getByText(
        'Showing the last available data — unable to refresh from the analytics provider right now.',
      ),
    ).toBeInTheDocument();
    // sections stay visible alongside the warning
    expect(screen.getByRole('heading', { name: 'Active Users' })).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    resolveAllWithFixtures('28d');
    const user = userEvent.setup();
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockedApi.getAnalyticsOverview).toHaveBeenCalledTimes(2);
    });
  });

  it('renders all visible labels via i18n when the locale is switched (UT-F06)', async () => {
    resolveAllWithFixtures('28d');

    renderSection();
    await waitForInitialLoad();
    expect(screen.getByText('Web Analytics')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Users' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'toggle-locale' }));

    expect(await screen.findByText('สถิติการเข้าชมเว็บไซต์')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ผู้ใช้งาน' })).toBeInTheDocument();
    expect(screen.queryByText('Web Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
  });

  it('renders the "Open in Google Analytics" link with the property deep link when meta resolves (UT-F10)', async () => {
    resolveAllWithFixtures('28d');

    renderSection();
    await waitForInitialLoad();

    const link = await screen.findByRole('link', { name: 'Open in Google Analytics' });
    expect(link).toHaveAttribute(
      'href',
      'https://analytics.google.com/analytics/web/#/p540943523/reports/intelligenthome',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the Google Analytics link when meta fails to load (UT-F10)', async () => {
    resolveAllWithFixtures('28d');
    mockedApi.getAnalyticsMeta.mockRejectedValue(new Error('unconfigured'));

    renderSection();
    await waitForInitialLoad();

    expect(
      screen.queryByRole('link', { name: 'Open in Google Analytics' }),
    ).not.toBeInTheDocument();
  });
});
