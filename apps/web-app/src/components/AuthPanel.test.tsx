import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthPanel } from './AuthPanel';

describe('AuthPanel', () => {
  it('renders the decorative background image', () => {
    const { container } = render(<AuthPanel />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/fs-bg.png');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders an overlay tint above the background image', () => {
    const { container } = render(<AuthPanel />);
    const overlay = container.querySelector(String.raw`.absolute.inset-0.bg-sky-950\/60`);
    expect(overlay).toBeInTheDocument();
  });
});
