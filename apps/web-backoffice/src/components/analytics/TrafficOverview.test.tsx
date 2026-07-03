// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { cloneElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrafficOverview } from './TrafficOverview';
import {
  emptyOverviewFixture,
  overviewFixture,
  zeroSessionsOverviewFixture,
} from './analyticsTestFixtures';

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

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('TrafficOverview', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton placeholders while loading', () => {
    const { container } = renderWithLocale(<TrafficOverview data={null} loading error={null} />);

    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
  });

  it('shows an inline error card without crashing when the panel fails to load', () => {
    renderWithLocale(
      <TrafficOverview data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
  });

  it('renders localized numeric totals and the daily trend chart on success', () => {
    renderWithLocale(<TrafficOverview data={overviewFixture} loading={false} error={null} />);

    // "Active Users" / "Sessions" also appear in the recharts legend, so scope
    // these assertions to the stat card headings.
    expect(screen.getByRole('heading', { name: 'Active Users' })).toBeInTheDocument();
    expect(screen.getByText('1,843')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument();
    expect(screen.getByText('2,571')).toBeInTheDocument();
    expect(screen.getByText('Page Views')).toBeInTheDocument();
    expect(screen.getByText('8,420')).toBeInTheDocument();
    expect(screen.getByText('Avg. Engagement Time')).toBeInTheDocument();
    expect(screen.getByText('74.3s')).toBeInTheDocument();
    expect(screen.getByText('Daily Trend')).toBeInTheDocument();
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });

  it('shows a no-data message instead of a chart when the series is empty', () => {
    renderWithLocale(<TrafficOverview data={emptyOverviewFixture} loading={false} error={null} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows a no-data message when every day in the series has zero sessions', () => {
    renderWithLocale(
      <TrafficOverview data={zeroSessionsOverviewFixture} loading={false} error={null} />,
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
