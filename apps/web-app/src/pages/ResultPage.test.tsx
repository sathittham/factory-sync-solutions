import { LocaleProvider } from '@/lib/i18n';
import type { Assessment, DimensionScore, QuizListItem } from '@/lib/types';
import authReducer from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockLocationState: { fromQuiz?: boolean } = {};
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
}));

const mockAssessmentsQuery = vi.fn();
const mockQuizzesQuery = vi.fn();
const mockQuizQuestionsQuery = vi.fn();
vi.mock('@/lib/queries', () => ({
  useAssessmentsQuery: () => mockAssessmentsQuery(),
  useQuizzesQuery: () => mockQuizzesQuery(),
  useQuizQuestionsQuery: (quizId: string) => mockQuizQuestionsQuery(quizId),
}));

vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// motion's useInView needs IntersectionObserver (absent in jsdom) — render plain wrappers.
vi.mock('@/components/motion', () => {
  const passthrough = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  );
  return {
    FadeIn: passthrough,
    ScaleIn: passthrough,
    StaggerChildren: passthrough,
    StaggerItem: passthrough,
  };
});

// recharts' ResponsiveContainer measures its DOM node via ResizeObserver, which
// jsdom does not implement. Render the chart with explicit pixel dimensions instead.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 800, height: 300 }),
  };
});

import { ResultPage } from './ResultPage';

function dim(id: string, score: number, over: Partial<DimensionScore> = {}): DimensionScore {
  return {
    dimensionId: id,
    dimensionName: `Dim ${id}`,
    dimensionNameTh: `มิติ ${id}`,
    score,
    maxScore: 5,
    ...over,
  };
}

function assessment(over: Partial<Assessment> = {}): Assessment {
  return {
    id: 'a1',
    uid: 'u1',
    quizId: 'shindan',
    scores: [dim('mgmt', 3.5)],
    overallScore: 3.52,
    strengths: ['จุดแข็งข้อ 1'],
    weaknesses: ['จุดที่ควรปรับปรุงข้อ 1'],
    diagnosis: 'Established',
    submittedAt: '2026-06-10T00:00:00Z',
    ...over,
  };
}

const QUIZZES: QuizListItem[] = [
  { id: 'shindan', nameTh: 'ชินดัน', nameEn: 'Shindan' },
  { id: 'factory', nameTh: 'โรงงาน', nameEn: 'Factory' },
];

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <LocaleProvider>
        <ResultPage />
      </LocaleProvider>
    </Provider>,
  );
  return store;
}

function setQueries(assessments: Assessment[], quizzes: QuizListItem[] = QUIZZES, pending = false) {
  mockAssessmentsQuery.mockReturnValue({ data: assessments, isPending: pending });
  mockQuizzesQuery.mockReturnValue({ data: quizzes });
  mockQuizQuestionsQuery.mockReturnValue({ data: { questions: [], dimensions: [] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
  mockLocationState.fromQuiz = undefined;
  // jsdom does not implement window.scrollTo — the "just completed" banner effect calls it.
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('ResultPage — loading', () => {
  it('shows skeletons while assessments are pending', () => {
    setQueries([], QUIZZES, true);
    const { container } = render(
      <Provider store={makeStore()}>
        <LocaleProvider>
          <ResultPage />
        </LocaleProvider>
      </Provider>,
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('ResultPage — no results', () => {
  it('shows an empty state per quiz tab and starts a quiz on click', async () => {
    setQueries([]);
    const store = renderPage();

    expect(screen.getByText('ยังไม่มีผลลัพธ์')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /เริ่มทำ ชินดัน/ }));

    expect(store.getState().quiz.quizId).toBe('shindan');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/quiz' });
  });
});

describe('ResultPage — with results', () => {
  it('renders the overall score, diagnosis, and strengths/weaknesses for the active quiz', () => {
    setQueries([assessment()]);
    renderPage();

    expect(screen.getByTestId('result-summary')).toBeInTheDocument();
    expect(screen.getByText('3.52')).toBeInTheDocument();
    expect(screen.getByText('มั่นคง')).toBeInTheDocument();
    expect(screen.getByTestId('result-spider-chart')).toBeInTheDocument();
    expect(screen.getByTestId('result-strengths-panel')).toHaveTextContent('จุดแข็งข้อ 1');
    expect(screen.getByTestId('result-weaknesses-panel')).toHaveTextContent('จุดที่ควรปรับปรุงข้อ 1');
  });

  it('expands a dimension row to show the score breakdown', async () => {
    // The Thai dimension name also appears in a visually-hidden a11y summary,
    // so scope the click to the expandable row's accessible name (a <button>)
    // rather than plain text.
    setQueries([assessment({ scores: [dim('mgmt', 4.2)] })]);
    renderPage();

    expect(screen.queryByText('รายละเอียดคะแนน')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /มิติ mgmt/ }));
    expect(screen.getByText('รายละเอียดคะแนน')).toBeInTheDocument();
  });

  it('lists previous assessments and switches the detail view on click', async () => {
    // Distinct scores (and a dimension score that matches neither) keep every
    // assertion below unambiguous even though the active assessment's score
    // legitimately renders twice (hero ring + its own row in the list).
    setQueries([
      assessment({
        id: 'newest',
        overallScore: 3.51,
        scores: [dim('mgmt', 4.9)],
        submittedAt: '2026-06-10T00:00:00Z',
      }),
      assessment({
        id: 'older',
        overallScore: 2.1,
        scores: [dim('mgmt', 4.9)],
        diagnosis: 'Developing',
      }),
    ]);
    renderPage();

    expect(screen.getByText('ผลประเมินก่อนหน้า')).toBeInTheDocument();
    expect(screen.getAllByText('3.51')).toHaveLength(2);
    expect(screen.getAllByText('2.10')).toHaveLength(1);

    const panel = screen.getByText('ผลประเมินก่อนหน้า').closest('div');
    if (!panel) throw new Error('previous-assessments panel not found');
    await userEvent.click(within(panel).getByText('2.10'));

    expect(screen.getAllByText('2.10')).toHaveLength(2);
    expect(screen.getAllByText('3.51')).toHaveLength(1);
  });

  it('switching tabs shows the other quiz group', async () => {
    setQueries([
      assessment({ id: 'a', quizId: 'shindan', overallScore: 3.52 }),
      assessment({ id: 'b', quizId: 'factory', overallScore: 4.1, diagnosis: 'Advanced' }),
    ]);
    renderPage();

    expect(screen.getByText('3.52')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'โรงงาน' }));
    expect(screen.getByText('4.10')).toBeInTheDocument();
  });

  it('dismisses the "just completed" banner and can dismiss it manually', () => {
    mockLocationState.fromQuiz = true;
    setQueries([assessment()]);
    renderPage();

    expect(screen.getByText('ผลการประเมินล่าสุดของคุณพร้อมแล้ว')).toBeInTheDocument();
  });

  it('Retake and Back-to-dashboard buttons act on the active quiz', async () => {
    setQueries([assessment({ quizId: 'shindan' })]);
    const store = renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'ทำแบบประเมินใหม่' }));
    expect(store.getState().quiz.quizId).toBe('shindan');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/quiz' });

    await userEvent.click(screen.getByRole('button', { name: 'กลับแดชบอร์ด' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });
});
