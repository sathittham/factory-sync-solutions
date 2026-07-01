import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Custom router history state — ResultPage reads `fromQuiz` to show the
// "just completed" banner right after QuizPage submits.
declare module '@tanstack/history' {
  interface HistoryState {
    fromQuiz?: boolean;
  }
}
