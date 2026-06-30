import { describe, expect, it } from 'vitest';
import resultReducer, {
  setAssessment,
  setAssessments,
  setLoading,
  type Assessment,
} from './resultSlice';

const mockAssessment: Assessment = {
  id: 'a-1',
  uid: 'u-1',
  quizId: 'shindan',
  scores: [
    {
      dimensionId: 'd1',
      dimensionName: 'Strategy',
      dimensionNameTh: 'กลยุทธ์',
      score: 4,
      maxScore: 5,
    },
  ],
  overallScore: 4,
  strengths: ['Strategy'],
  weaknesses: [],
  diagnosis: 'Advanced',
  submittedAt: '2026-01-01T00:00:00Z',
};

describe('resultSlice', () => {
  const initial = resultReducer(undefined, { type: 'unknown' });

  it('has correct initial state', () => {
    expect(initial).toEqual({
      assessment: null,
      assessments: [],
      loading: false,
    });
  });

  it('setAssessment', () => {
    const state = resultReducer(initial, setAssessment(mockAssessment));
    expect(state.assessment).toEqual(mockAssessment);
  });

  it('setAssessments', () => {
    const state = resultReducer(initial, setAssessments([mockAssessment]));
    expect(state.assessments).toHaveLength(1);
  });

  it('setLoading', () => {
    const state = resultReducer(initial, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setAssessments does not clear singular assessment', () => {
    let state = resultReducer(initial, setAssessment(mockAssessment));
    state = resultReducer(state, setAssessments([mockAssessment]));
    expect(state.assessment).toEqual(mockAssessment);
    expect(state.assessments).toHaveLength(1);
  });
});
