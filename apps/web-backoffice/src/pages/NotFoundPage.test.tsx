import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/nowhere']}>
      <Routes>
        <Route path="/nowhere" element={<NotFoundPage />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the 404 message', () => {
    renderPage();

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('navigates to the dashboard when the button is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
