import { LocaleProvider } from '@/lib/i18n';
import type { Assessment, DimensionScore, QuizListItem } from '@/lib/types';
import authReducer, { setProfile } from '@/store/authSlice';
import quizReducer, { setAnswer, setQuizId } from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockAssessmentsQuery = vi.fn();
const mockQuizzesQuery = vi.fn();
vi.mock('@/lib/queries', () => ({
  useAssessmentsQuery: () => mockAssessmentsQuery(),
  useQuizzesQuery: () => mockQuizzesQuery(),
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

import { DashboardPage } from './DashboardPage';

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
    strengths: [],
    weaknesses: [],
    diagnosis: 'Established',
    submittedAt: '2026-06-10T00:00:00Z',
    ...over,
  };
}

const QUIZZES: QuizListItem[] = [
  { id: 'shindan', nameTh: 'ชินดัน', nameEn: 'Shindan' },
  { id: 'factory', nameTh: 'โรงงาน', nameEn: 'Factory' },
  { id: 'cyber', nameTh: 'ไซเบอร์', nameEn: 'Cybersecurity' },
];

const PROFILE = {
  uid: 'u1',
  email: 'op@example.com',
  displayName: 'Op',
  companyName: 'โรงงานทดสอบ',
  companyRegId: '0105500000000',
  industryType: 'manufacturing',
  companySize: 'S',
  contactName: 'Op',
  contactEmail: 'op@example.com',
  contactPhone: '0800000000',
  role: 'user',
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <LocaleProvider>
        <DashboardPage />
      </LocaleProvider>
    </Provider>,
  );
  return store;
}

function setQueries(assessments: Assessment[], quizzes: QuizListItem[] = QUIZZES, pending = false) {
  mockAssessmentsQuery.mockReturnValue({ data: assessments, isPending: pending });
  mockQuizzesQuery.mockReturnValue({ data: quizzes, isPending: false });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
});

describe('DashboardPage — states', () => {
  it('UT-013: shows skeletons while the assessments query is pending', () => {
    mockAssessmentsQuery.mockReturnValue({ data: [], isPending: true });
    mockQuizzesQuery.mockReturnValue({ data: [], isPending: true });
    renderPage();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('ยังไม่มีผลประเมิน')).not.toBeInTheDocument();
  });

  it('UT-014: empty state renders ghost KPI row, banner and quiz grid via t()', () => {
    setQueries([]);
    renderPage();

    expect(screen.getByText('ยังไม่มีผลประเมิน')).toBeInTheDocument();
    expect(screen.getByText('เริ่มทำแบบประเมินเพื่อตรวจสุขภาพโรงงานของคุณ')).toBeInTheDocument();
    expect(screen.getAllByText('--')).toHaveLength(4);
    // one start card per available quiz
    expect(screen.getByText('ชินดัน')).toBeInTheDocument();
    expect(screen.getByText('โรงงาน')).toBeInTheDocument();
    expect(screen.getByText('ไซเบอร์')).toBeInTheDocument();
  });

  it('UT-015: header falls back to quiz.yourCompany without a profile', () => {
    setQueries([]);
    renderPage();

    expect(screen.getByText('บริษัทของคุณ')).toBeInTheDocument();
  });

  it('header shows the profile company name when present', () => {
    setQueries([]);
    const store = makeStore();
    store.dispatch(setProfile(PROFILE));
    renderPage(store);

    expect(screen.getByText('โรงงานทดสอบ')).toBeInTheDocument();
  });
});

describe('DashboardPage — derivations and KPI cards', () => {
  it('UT-001/UT-016: groups by quizId with the first entry as latest and formats KPIs', () => {
    setQueries([
      assessment({ id: 'new', overallScore: 3.52, submittedAt: '2026-06-10T00:00:00Z' }),
      assessment({ id: 'old', overallScore: 2, diagnosis: 'Developing' }),
    ]);
    renderPage();

    expect(screen.getByText('3.52')).toBeInTheDocument(); // latest, toFixed(2)
    expect(screen.getByText('/ 5.00')).toBeInTheDocument();
    expect(screen.getByText('มั่นคง')).toBeInTheDocument(); // diagnosis.Established
    expect(screen.getByText('2')).toBeInTheDocument(); // attempt count
    expect(screen.getByText('ครั้ง')).toBeInTheDocument(); // dashboard.times unit
    expect(screen.getByText(/10\/06\/2569/)).toBeInTheDocument(); // Buddhist Era date (+ time suffix)
    expect(screen.queryByText('2.00')).not.toBeInTheDocument();
  });

  it('UT-002: assessments without a quizId fall back to the shindan group', async () => {
    setQueries([assessment({ quizId: '' })]);
    const store = renderPage();

    await userEvent.click(screen.getByText('ทำแบบประเมินใหม่'));
    expect(store.getState().quiz.quizId).toBe('shindan');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/quiz' });
  });

  it('UT-003: uncompleted list shows only quizzes without assessments', () => {
    setQueries([assessment({ quizId: 'shindan' })]);
    renderPage();

    expect(screen.getByText('แบบประเมินอื่น')).toBeInTheDocument();
    expect(screen.getByText('โรงงาน')).toBeInTheDocument();
    expect(screen.getByText('ไซเบอร์')).toBeInTheDocument();
    // completed quiz has a single group → no tabs, so its name appears nowhere
    expect(screen.queryByText('ชินดัน')).not.toBeInTheDocument();
  });

  it('UT-017: uncompleted section is hidden when every quiz is completed', () => {
    setQueries([
      assessment({ id: 'a', quizId: 'shindan' }),
      assessment({ id: 'b', quizId: 'factory' }),
      assessment({ id: 'c', quizId: 'cyber' }),
    ]);
    renderPage();

    expect(screen.queryByText('แบบประเมินอื่น')).not.toBeInTheDocument();
  });
});

describe('DashboardPage — quiz selector tabs', () => {
  it('UT-006: no tabs when a single quiz is completed', () => {
    setQueries([assessment({ quizId: 'shindan' })]);
    renderPage();

    expect(screen.queryByRole('button', { name: 'ชินดัน' })).not.toBeInTheDocument();
  });

  it('UT-004/UT-005: defaults to the first completed quiz and swaps on tab click', async () => {
    setQueries([
      assessment({ id: 'a', quizId: 'shindan', overallScore: 3.52 }),
      assessment({ id: 'b', quizId: 'factory', overallScore: 4.1, diagnosis: 'Advanced' }),
    ]);
    renderPage();

    expect(screen.getByText('3.52')).toBeInTheDocument();
    expect(screen.queryByText('4.10')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'โรงงาน' }));
    expect(screen.getByText('4.10')).toBeInTheDocument();
    expect(screen.queryByText('3.52')).not.toBeInTheDocument();
  });
});

describe('DimensionRow', () => {
  it('UT-007/UT-008: bar and score colors follow the ≥4/≥3/≥2 thresholds', () => {
    setQueries([
      assessment({
        scores: [dim('a', 4), dim('b', 3), dim('c', 2), dim('d', 1.9)],
      }),
    ]);
    renderPage();

    expect(document.querySelector('.bg-emerald-500')).not.toBeNull();
    expect(document.querySelector('.bg-blue-500')).not.toBeNull();
    expect(document.querySelector('.bg-amber-500')).not.toBeNull();
    expect(document.querySelector('.bg-red-500')).not.toBeNull();
    expect(screen.getByText('1.9')).toHaveClass('text-red-700');
  });

  it('UT-009: bar width is proportional and capped at 100%', () => {
    setQueries([assessment({ scores: [dim('a', 3), dim('b', 5.5)] })]);
    renderPage();

    const blue = document.querySelector('.bg-blue-500') as HTMLElement;
    const emerald = document.querySelector('.bg-emerald-500') as HTMLElement;
    expect(blue.style.width).toBe('60%');
    expect(emerald.style.width).toBe('100%');
  });

  it('UT-010: Thai locale falls back to the English name when TH is missing', () => {
    setQueries([assessment({ scores: [dim('a', 3.0, { dimensionNameTh: '' })] })]);
    renderPage();

    expect(screen.getByText('Dim a')).toBeInTheDocument();
  });
});

describe('DashboardPage — actions', () => {
  it('UT-011: Start dispatches resetQuiz + setQuizId and navigates to /quiz', async () => {
    setQueries([assessment({ quizId: 'shindan' })]);
    const store = makeStore();
    store.dispatch(setQuizId('shindan'));
    store.dispatch(setAnswer({ questionId: 'q1', value: 3 }));
    renderPage(store);

    await userEvent.click(screen.getByText('ไซเบอร์'));
    expect(store.getState().quiz.quizId).toBe('cyber');
    expect(store.getState().quiz.answers).toEqual({}); // resetQuiz ran
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/quiz' });
  });

  it('UT-012: Retake targets the active (tab-selected) quiz', async () => {
    setQueries([
      assessment({ id: 'a', quizId: 'shindan' }),
      assessment({ id: 'b', quizId: 'factory' }),
    ]);
    const store = renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'โรงงาน' }));
    await userEvent.click(screen.getByText('ทำแบบประเมินใหม่'));
    expect(store.getState().quiz.quizId).toBe('factory');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/quiz' });
  });

  it('View Results navigates to /results', async () => {
    setQueries([assessment()]);
    renderPage();

    // 'ดูผลลัพธ์' is both the card title and its CTA — either lands on the same button
    await userEvent.click(screen.getAllByText('ดูผลลัพธ์')[0]);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/results' });
  });
});
