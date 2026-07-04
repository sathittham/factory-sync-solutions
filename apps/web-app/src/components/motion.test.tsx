import { render, screen } from '@testing-library/react';
import { type ReactNode, forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

const useInViewMock = vi.fn();

interface MockMotionDivProps {
  children?: ReactNode;
  initial?: unknown;
  animate?: unknown;
  transition?: unknown;
  variants?: unknown;
  className?: string;
}

// motion/react's IntersectionObserver-driven useInView + real animation timing
// are irrelevant here — swap in a controllable stub so each branch of the
// `inView ? ... : ...` ternaries in motion.tsx can be exercised deterministically.
vi.mock('motion/react', () => ({
  motion: {
    div: forwardRef<HTMLDivElement, MockMotionDivProps>(function MockMotionDiv(
      { children, className },
      ref,
    ) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      );
    }),
  },
  useInView: (...args: unknown[]) => useInViewMock(...args),
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

import { AnimatePresence, FadeIn, ScaleIn, StaggerChildren, StaggerItem, motion } from './motion';

describe('motion helpers', () => {
  describe('FadeIn', () => {
    it('renders children out of view with default delay/y', () => {
      useInViewMock.mockReturnValue(false);
      render(<FadeIn>Out of view content</FadeIn>);
      expect(screen.getByText('Out of view content')).toBeInTheDocument();
    });

    it('renders children once scrolled into view with custom delay/y/className', () => {
      useInViewMock.mockReturnValue(true);
      render(
        <FadeIn delay={0.2} y={40} className="fade-custom">
          In view content
        </FadeIn>,
      );
      const node = screen.getByText('In view content');
      expect(node).toBeInTheDocument();
      expect(node).toHaveClass('fade-custom');
    });
  });

  describe('StaggerChildren', () => {
    it('renders children hidden with default stagger', () => {
      useInViewMock.mockReturnValue(false);
      render(
        <StaggerChildren>
          <span>Stagger hidden</span>
        </StaggerChildren>,
      );
      expect(screen.getByText('Stagger hidden')).toBeInTheDocument();
    });

    it('renders children shown with custom stagger/className', () => {
      useInViewMock.mockReturnValue(true);
      render(
        <StaggerChildren stagger={0.15} className="stagger-custom">
          <span>Stagger shown</span>
        </StaggerChildren>,
      );
      expect(screen.getByText('Stagger shown')).toBeInTheDocument();
    });
  });

  describe('StaggerItem', () => {
    it('renders its children with an optional className', () => {
      render(
        <StaggerItem className="item-custom">
          <span>Item content</span>
        </StaggerItem>,
      );
      expect(screen.getByText('Item content')).toBeInTheDocument();
    });
  });

  describe('ScaleIn', () => {
    it('renders children out of view with default delay', () => {
      useInViewMock.mockReturnValue(false);
      render(<ScaleIn>Scale hidden</ScaleIn>);
      expect(screen.getByText('Scale hidden')).toBeInTheDocument();
    });

    it('renders children in view with custom delay/className', () => {
      useInViewMock.mockReturnValue(true);
      render(
        <ScaleIn delay={0.3} className="scale-custom">
          Scale shown
        </ScaleIn>,
      );
      const node = screen.getByText('Scale shown');
      expect(node).toBeInTheDocument();
      expect(node).toHaveClass('scale-custom');
    });
  });

  it('re-exports AnimatePresence and motion from motion/react', () => {
    render(
      <AnimatePresence>
        <motion.div className="passthrough">Presence content</motion.div>
      </AnimatePresence>,
    );
    expect(screen.getByText('Presence content')).toBeInTheDocument();
  });
});
