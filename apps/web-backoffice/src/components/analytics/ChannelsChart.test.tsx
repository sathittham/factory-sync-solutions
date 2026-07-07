// @vitest-environment jsdom

import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChannelsChart } from './ChannelsChart';
import { channelsFixture, emptyChannelsFixture } from './analyticsTestFixtures';

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('ChannelsChart', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton rows while loading', () => {
    const { container } = renderWithLocale(<ChannelsChart data={null} loading error={null} />);

    expect(screen.queryByText('Organic Search')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
  });

  it('shows an inline error message without crashing when the panel fails to load', () => {
    renderWithLocale(
      <ChannelsChart data={null} loading={false} error="Analytics is temporarily unavailable." />,
    );

    expect(screen.getByText('Analytics is temporarily unavailable.')).toBeInTheDocument();
  });

  it('shows a no-data message when there are no channels in range', () => {
    renderWithLocale(<ChannelsChart data={emptyChannelsFixture} loading={false} error={null} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders each channel with its session count and percentage share', () => {
    renderWithLocale(<ChannelsChart data={channelsFixture} loading={false} error={null} />);

    expect(screen.getByText('Organic Search')).toBeInTheDocument();
    expect(screen.getByText(/1,200/)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });
});
