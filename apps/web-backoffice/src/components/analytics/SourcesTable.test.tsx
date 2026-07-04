// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SourcesTable } from './SourcesTable';
import { emptySourcesFixture, sourcesFixture } from './analyticsTestFixtures';

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('SourcesTable', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton rows while loading', () => {
    const { container } = renderWithLocale(<SourcesTable data={null} loading error={null} />);

    expect(screen.queryByText('google / organic')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('shows an inline error message without crashing when the panel fails to load', () => {
    renderWithLocale(
      <SourcesTable data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a no-data message when there are no sources in range', () => {
    renderWithLocale(<SourcesTable data={emptySourcesFixture} loading={false} error={null} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders source rows with formatted sessions and share percentages', () => {
    renderWithLocale(<SourcesTable data={sourcesFixture} loading={false} error={null} />);

    const rows = screen.getAllByRole('row');
    // header row + one row per source
    expect(rows).toHaveLength(sourcesFixture.sources.length + 1);
    expect(screen.getByText('google / organic')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('(direct) / (none)')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
});
