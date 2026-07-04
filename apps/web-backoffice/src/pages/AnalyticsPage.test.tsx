// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';

vi.mock('@/components/analytics/WebAnalyticsSection', () => ({
  WebAnalyticsSection: () => <div data-testid="web-analytics-section" />,
}));

describe('AnalyticsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders the page header and hosts WebAnalyticsSection', () => {
    render(
      <LocaleProvider>
        <AnalyticsPage />
      </LocaleProvider>,
    );

    expect(screen.getByRole('heading', { name: /Analytics|สถิติเว็บไซต์/ })).toBeInTheDocument();
    expect(screen.getByTestId('web-analytics-section')).toBeInTheDocument();
  });

  it('renders the Thai page title when locale is th', () => {
    localStorage.setItem('fsb-locale', 'th');
    render(
      <LocaleProvider>
        <AnalyticsPage />
      </LocaleProvider>,
    );

    expect(screen.getByRole('heading', { name: 'สถิติเว็บไซต์' })).toBeInTheDocument();
  });
});
