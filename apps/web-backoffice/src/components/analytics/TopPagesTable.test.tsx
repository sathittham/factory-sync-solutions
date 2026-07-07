// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TopPagesTable } from './TopPagesTable';
import { emptyTopPagesFixture, topPagesFixture } from './analyticsTestFixtures';

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('TopPagesTable', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton rows while loading', () => {
    const { container } = renderWithLocale(<TopPagesTable data={null} loading error={null} />);

    expect(screen.queryByText('/')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('shows an inline error message without crashing when the panel fails to load', () => {
    renderWithLocale(
      <TopPagesTable data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a no-data message when there are no pages in range', () => {
    renderWithLocale(<TopPagesTable data={emptyTopPagesFixture} loading={false} error={null} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders rows ordered as provided with formatted views and engagement time', () => {
    renderWithLocale(<TopPagesTable data={topPagesFixture} loading={false} error={null} />);

    const rows = screen.getAllByRole('row');
    // header row + one row per page
    expect(rows).toHaveLength(topPagesFixture.pages.length + 1);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('42s')).toBeInTheDocument();
  });

  it('truncates a long page path visually while keeping the full path available for its tooltip', () => {
    renderWithLocale(<TopPagesTable data={topPagesFixture} loading={false} error={null} />);

    const longPath = topPagesFixture.pages[1].path;
    const trigger = screen.getByText(longPath);

    expect(trigger).toHaveClass('truncate');
    expect(trigger.className).toMatch(/max-w-\[220px\]/);
  });
});
