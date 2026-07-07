import { LocaleProvider } from '@/lib/i18n';
import authReducer from '@/store/authSlice';
import quizReducer, { setAnswer, setCurrentStep, setQuizId } from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockQuizQuestionsQuery = vi.fn();
const mockSubmitQuizMutation = vi.fn();
vi.mock('@/lib/queries', () => ({
  useQuizQuestionsQuery: (quizId: string) => mockQuizQuestionsQuery(quizId),
  useSubmitQuizMutation: () => mockSubmitQuizMutation(),
}));

// motion/react's exit animations + useInView are irrelevant to this page's
// behavior and jsdom lacks the layout APIs they rely on — render plain passthroughs.
interface MotionDivProps {
  children?: ReactNode;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  [key: string]: unknown;
}

vi.mock('@/components/motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...rest }: MotionDivProps) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { QuizPage } from './QuizPage';

const DIMENSIONS = [
  { id: 'd1', nameTh: 'มิติหนึ่ง', nameEn: 'Dimension One', weight: 1 },
  { id: 'd2', nameTh: 'มิติสอง', nameEn: 'Dimension Two', weight: 1 },
];

const QUESTIONS = [
  { id: 'q1', dimensionId: 'd1', textTh: 'คำถามหนึ่ง', textEn: 'Question One' },
  { id: 'q2', dimensionId: 'd1', textTh: 'คำถามสอง', textEn: 'Question Two' },
  { id: 'q3', dimensionId: 'd2', textTh: 'คำถามสาม', textEn: 'Question Three' },
];

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <LocaleProvider>
        <QuizPage />
      </LocaleProvider>
    </Provider>,
  );
  return store;
}

function setQuestionsQuery(
  data: { questions: typeof QUESTIONS; dimensions: typeof DIMENSIONS } | undefined,
  overrides: { isPending?: boolean; isError?: boolean } = {},
) {
  mockQuizQuestionsQuery.mockReturnValue({
    data,
    isPending: overrides.isPending ?? false,
    isError: overrides.isError ?? false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
  mockSubmitQuizMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  // jsdom does not implement window.scrollTo — QuizPage calls it on step change.
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('QuizPage — loading and error states', () => {
  it('shows skeletons while questions are loading', () => {
    setQuestionsQuery(undefined, { isPending: true });
    const { container } = render(
      <Provider store={makeStore()}>
        <LocaleProvider>
          <QuizPage />
        </LocaleProvider>
      </Provider>,
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('คำถามหนึ่ง')).not.toBeInTheDocument();
  });

  it('shows a load-error message alongside the (empty) page when the query errors', () => {
    setQuestionsQuery({ questions: [], dimensions: [] }, { isError: true });
    renderPage();

    expect(screen.getByText('ไม่สามารถโหลดคำถามได้')).toBeInTheDocument();
  });
});

describe('QuizPage — question rendering and answering', () => {
  it('renders the first dimension by default with its questions', () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    renderPage();

    expect(screen.getByRole('heading', { name: 'มิติหนึ่ง' })).toBeInTheDocument();
    expect(screen.getByText('คำถามหนึ่ง')).toBeInTheDocument();
    expect(screen.getByText('คำถามสอง')).toBeInTheDocument();
    expect(screen.queryByText('คำถามสาม')).not.toBeInTheDocument();
    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('answering a Likert question dispatches setAnswer and marks the button pressed', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = renderPage();

    const q1Card = screen.getByText('คำถามหนึ่ง').closest('[data-testid="quiz-question-card"]');
    if (!q1Card) throw new Error('question card not found');
    const fourButton = within(q1Card as HTMLElement).getByRole('button', { name: '4' });
    await userEvent.click(fourButton);

    expect(store.getState().quiz.answers.q1).toBe(4);
    expect(fourButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders rubric grade labels (A-F, best to worst) for the factory quiz', () => {
    const rubricQuestions = [
      {
        id: 'q1',
        dimensionId: 'd1',
        textTh: 'คำถามหนึ่ง',
        textEn: 'Question One',
        rubric: {
          '5': { th: 'ดีเยี่ยม', en: 'Excellent' },
          '4': { th: 'ดี', en: 'Good' },
          '3': { th: 'ปานกลาง', en: 'Average' },
          '2': { th: 'แย่', en: 'Poor' },
          '1': { th: 'แย่มาก', en: 'Very poor' },
        },
      },
    ];
    setQuestionsQuery({ questions: rubricQuestions, dimensions: [DIMENSIONS[0]] });
    const store = makeStore();
    store.dispatch(setQuizId('factory'));
    renderPage(store);

    const gradeLabels = screen.getAllByText(/^[A-F]$/);
    expect(gradeLabels.map((el) => el.textContent)).toEqual(['A', 'B', 'C', 'D', 'F']);
    expect(screen.getByText('ดีเยี่ยม')).toBeInTheDocument();
  });

  it('progress counter reflects answered questions out of the quiz total', () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = makeStore();
    store.dispatch(setAnswer({ questionId: 'q1', value: 3 }));
    const { container } = render(
      <Provider store={store}>
        <LocaleProvider>
          <QuizPage />
        </LocaleProvider>
      </Provider>,
    );

    const counter = container.querySelector('.text-primary.tabular-nums');
    expect(counter).toHaveTextContent('1/3');
  });
});

describe('QuizPage — step navigation', () => {
  it('Previous is disabled on the first step; Next advances to the next dimension', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = renderPage();

    expect(screen.getByTestId('quiz-prev-btn')).toBeDisabled();
    await userEvent.click(screen.getByTestId('quiz-next-btn'));

    expect(store.getState().quiz.currentStep).toBe(1);
    expect(screen.getByRole('heading', { name: 'มิติสอง' })).toBeInTheDocument();
    expect(screen.getByTestId('quiz-prev-btn')).toBeEnabled();
  });

  it('clicking a dimension tab jumps directly to that step', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'มิติสอง' }));
    expect(store.getState().quiz.currentStep).toBe(1);
  });

  it('shows the Submit button (not Next) on the last step', () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = makeStore();
    store.dispatch(setCurrentStep(1));
    renderPage(store);

    expect(screen.getByTestId('quiz-submit-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('quiz-next-btn')).not.toBeInTheDocument();
  });
});

describe('QuizPage — submission', () => {
  function fullyAnsweredStore() {
    const store = makeStore();
    store.dispatch(setAnswer({ questionId: 'q1', value: 4 }));
    store.dispatch(setAnswer({ questionId: 'q2', value: 3 }));
    store.dispatch(setAnswer({ questionId: 'q3', value: 5 }));
    store.dispatch(setCurrentStep(1));
    return store;
  }

  it('Submit is disabled until every question is answered', () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = makeStore();
    store.dispatch(setCurrentStep(1));
    renderPage(store);

    expect(screen.getByTestId('quiz-submit-btn')).toBeDisabled();
  });

  it('submits, shows the celebration overlay, then resets and navigates to /results', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const mutateAsync = vi.fn().mockResolvedValue({ overallScore: 4.2, diagnosis: 'Advanced' });
    mockSubmitQuizMutation.mockReturnValue({ mutateAsync, isPending: false });
    const store = fullyAnsweredStore();
    renderPage(store);

    await userEvent.click(screen.getByTestId('quiz-submit-btn'));

    expect(mutateAsync).toHaveBeenCalledWith({
      quizId: 'shindan',
      answers: expect.arrayContaining([
        { questionId: 'q1', value: 4 },
        { questionId: 'q2', value: 3 },
        { questionId: 'q3', value: 5 },
      ]),
    });
    expect(await screen.findByText('ส่งแบบประเมินเรียบร้อย!')).toBeInTheDocument();
    expect(store.getState().auth.hasCompletedQuiz).toBe(true);

    await vi.advanceTimersByTimeAsync(1800);

    expect(store.getState().quiz.answers).toEqual({});
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/results', state: { fromQuiz: true } });
  });

  it('shows a submit error message when the mutation rejects', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const mutateAsync = vi.fn().mockRejectedValue(new Error('network down'));
    mockSubmitQuizMutation.mockReturnValue({ mutateAsync, isPending: false });
    const store = fullyAnsweredStore();
    renderPage(store);

    await userEvent.click(screen.getByTestId('quiz-submit-btn'));

    expect(await screen.findByText('การส่งแบบประเมินล้มเหลว กรุณาลองอีกครั้ง')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('QuizPage — exit confirmation', () => {
  it('opens a confirm dialog and stays on the page when cancelled', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /ออก/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('ออกจากแบบประเมิน?')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'ทำต่อ' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaving the quiz resets state and navigates home', async () => {
    setQuestionsQuery({ questions: QUESTIONS, dimensions: DIMENSIONS });
    const store = makeStore();
    store.dispatch(setAnswer({ questionId: 'q1', value: 2 }));
    renderPage(store);

    await userEvent.click(screen.getByRole('button', { name: /ออก/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'ออก' }));

    expect(store.getState().quiz.answers).toEqual({});
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });
});
