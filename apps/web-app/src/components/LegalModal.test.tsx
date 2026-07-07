import { LegalModal } from '@/components/LegalModal';
import type { LegalType } from '@/components/LegalModal';
import { LocaleProvider } from '@/lib/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderModal(open: LegalType) {
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <LegalModal open={open} onClose={onClose} />
    </LocaleProvider>,
  );
  return { onClose };
}

describe('LegalModal', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fss-locale', 'en');
  });

  it('renders nothing when open is null', () => {
    renderModal(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the Terms and Conditions dialog', () => {
    renderModal('terms');
    expect(screen.getByRole('heading', { name: 'Terms and Conditions' })).toBeInTheDocument();
    expect(screen.getByText(/Acceptance of Terms/)).toBeInTheDocument();
  });

  it('renders the Privacy Policy dialog', () => {
    renderModal('privacy');
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Information We Collect/)).toBeInTheDocument();
  });

  it('renders the Cookie Policy dialog', () => {
    renderModal('cookies');
    expect(screen.getByRole('heading', { name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText(/What Are Cookies/)).toBeInTheDocument();
  });

  it('renders the Marketing Policy dialog', () => {
    renderModal('marketing');
    expect(screen.getByRole('heading', { name: 'Marketing Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Data Used for Marketing/)).toBeInTheDocument();
  });

  it('renders Thai content when locale is th', () => {
    localStorage.setItem('fss-locale', 'th');
    renderModal('terms');
    expect(screen.getByRole('heading', { name: 'ข้อกำหนดและเงื่อนไขการใช้งาน' })).toBeInTheDocument();
  });

  it('calls onClose when the dialog close button is clicked', () => {
    const { onClose } = renderModal('terms');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderModal('privacy');
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
