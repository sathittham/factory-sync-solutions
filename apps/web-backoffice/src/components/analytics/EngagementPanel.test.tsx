// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { cloneElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngagementPanel } from './EngagementPanel';
import {
  emptyEngagementFixture,
  engagementFixture,
  zeroActivityEngagementFixture,
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

describe('EngagementPanel', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton placeholders while loading', () => {
    const { container } = renderWithLocale(<EngagementPanel data={null} loading error={null} />);

    expect(screen.queryByText('DAU')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
  });

  it('shows an inline error card without crashing when the panel fails to load', () => {
    renderWithLocale(
      <EngagementPanel data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('DAU')).not.toBeInTheDocument();
  });

  it('renders DAU/WAU/MAU totals, stickiness as a percentage, and the trend chart on success', () => {
    renderWithLocale(<EngagementPanel data={engagementFixture} loading={false} error={null} />);

    expect(screen.getByRole('heading', { name: 'DAU' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WAU' })).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'MAU' })).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stickiness' })).toBeInTheDocument();
    expect(screen.getByText('9.2%')).toBeInTheDocument();
    expect(screen.getByText('Daily active users')).toBeInTheDocument();
    expect(screen.getByText('Weekly active users')).toBeInTheDocument();
    expect(screen.getByText('Monthly active users')).toBeInTheDocument();
    expect(screen.getByText('Engagement Trend')).toBeInTheDocument();
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });

  it('shows a no-data message instead of a chart when the series is empty', () => {
    renderWithLocale(
      <EngagementPanel data={emptyEngagementFixture} loading={false} error={null} />,
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows a no-data message when every day in the series has zero activity', () => {
    renderWithLocale(
      <EngagementPanel data={zeroActivityEngagementFixture} loading={false} error={null} />,
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
