import { PageHeader, PageLayout } from '@/components/PageLayout';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PageLayout (re-export)', () => {
  it('renders children inside a centered container by default', () => {
    const { container } = render(
      <PageLayout data-testid="page-layout">
        <p>Body content</p>
      </PageLayout>,
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByTestId('page-layout')).toHaveClass('container', 'max-w-5xl');
    expect(container.firstChild).not.toHaveClass('w-full');
  });

  it('spans the full width when fluid is set', () => {
    render(
      <PageLayout fluid data-testid="page-layout">
        <p>Body content</p>
      </PageLayout>,
    );
    expect(screen.getByTestId('page-layout')).toHaveClass('w-full');
  });

  it('merges a custom className', () => {
    render(
      <PageLayout className="custom-class" data-testid="page-layout">
        <span>x</span>
      </PageLayout>,
    );
    expect(screen.getByTestId('page-layout')).toHaveClass('custom-class');
  });
});

describe('PageHeader (re-export)', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders an optional description', () => {
    render(<PageHeader title="Dashboard" description="Overview of your factory" />);
    expect(screen.getByText('Overview of your factory')).toBeInTheDocument();
  });

  it('omits the description paragraph when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders optional actions', () => {
    render(<PageHeader title="Dashboard" actions={<button type="button">Export</button>} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
