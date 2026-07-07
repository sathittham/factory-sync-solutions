// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AudiencePanel } from './AudiencePanel';
import { audienceFixture, emptyAudienceFixture } from './analyticsTestFixtures';

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('AudiencePanel', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton rows while loading', () => {
    const { container } = renderWithLocale(<AudiencePanel data={null} loading error={null} />);

    expect(screen.queryByText('Thailand')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
  });

  it('shows an inline error for countries and hides devices without crashing', () => {
    renderWithLocale(
      <AudiencePanel data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('shows independent no-data messages for empty countries and devices', () => {
    renderWithLocale(<AudiencePanel data={emptyAudienceFixture} loading={false} error={null} />);

    expect(screen.getAllByText('No data')).toHaveLength(2);
  });

  it('renders top countries and maps known device categories to localized labels', () => {
    renderWithLocale(<AudiencePanel data={audienceFixture} loading={false} error={null} />);

    expect(screen.getByText('Thailand')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('Singapore')).toBeInTheDocument();

    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    // unmapped device categories fall back to the raw GA4 value
    expect(screen.getByText('smarttv')).toBeInTheDocument();
  });
});
