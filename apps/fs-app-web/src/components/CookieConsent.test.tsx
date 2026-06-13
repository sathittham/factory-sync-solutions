import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/lib/i18n';
import { updateConsentMode } from '@/lib/analytics';
import { CookieConsent, CONSENT_KEY } from '@/components/CookieConsent';

vi.mock('@/lib/analytics', () => ({
  updateConsentMode: vi.fn(),
  trackEvent: vi.fn(),
}));

function renderConsent(props: Partial<React.ComponentProps<typeof CookieConsent>> = {}) {
  const onClose = vi.fn();
  const onOpenLegal = vi.fn();
  render(
    <LocaleProvider>
      <CookieConsent open={true} onClose={onClose} onOpenLegal={onOpenLegal} {...props} />
    </LocaleProvider>,
  );
  return { onClose, onOpenLegal };
}

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the banner when open=true', () => {
    renderConsent();
    expect(screen.getByTestId('cookie-accept-all-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cookie-settings-btn')).toBeInTheDocument();
  });

  it('renders nothing when open=false', () => {
    renderConsent({ open: false });
    expect(screen.queryByTestId('cookie-accept-all-btn')).not.toBeInTheDocument();
  });

  it('accept all calls onClose and writes "all" to localStorage', () => {
    const { onClose } = renderConsent();
    fireEvent.click(screen.getByTestId('cookie-accept-all-btn'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem(CONSENT_KEY)).toBe('all');
  });

  it('accept all calls updateConsentMode with analytics=true, marketing=true', () => {
    renderConsent();
    fireEvent.click(screen.getByTestId('cookie-accept-all-btn'));
    expect(vi.mocked(updateConsentMode)).toHaveBeenCalledWith(true, true);
  });

  it('clicking settings button opens the settings dialog', async () => {
    renderConsent();
    fireEvent.click(screen.getByTestId('cookie-settings-btn'));
    expect(await screen.findByTestId('cookie-confirm-btn')).toBeInTheDocument();
  });

  it('openSettings=true renders settings dialog directly', () => {
    renderConsent({ openSettings: true });
    expect(screen.getByTestId('cookie-confirm-btn')).toBeInTheDocument();
  });

  it('confirm selection calls onClose and saves consent to localStorage', async () => {
    const { onClose } = renderConsent();
    fireEvent.click(screen.getByTestId('cookie-settings-btn'));
    await screen.findByTestId('cookie-confirm-btn');
    fireEvent.click(screen.getByTestId('cookie-confirm-btn'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem(CONSENT_KEY)).not.toBeNull();
  });

  it('confirm with all toggles on saves "all" to localStorage', async () => {
    renderConsent({ openSettings: true });
    const switches = screen.getAllByRole('switch');
    for (const sw of switches) fireEvent.click(sw);
    fireEvent.click(screen.getByTestId('cookie-confirm-btn'));
    expect(localStorage.getItem(CONSENT_KEY)).toBe('all');
  });
});
