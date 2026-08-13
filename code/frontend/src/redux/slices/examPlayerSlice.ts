import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ActiveQuestionState {
    questionId: string;
    sequenceIndex: number;
    prompt: string;
    type: "MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT" | "LONG";
    options?: Array<{ id: string; text: string }>;
    isLocked: boolean;
}

export interface ExamSession {
    sessionId: string;
    examId: string;
    examTitle: string;
    totalQuestions: number;
    currentSequenceIndex: number;
    timeRemainingSeconds: number | null;
    isForwardOnly: boolean;
    isCompleted: boolean;
    startedAt: string | null;
    completedAt: string | null;
}

interface ExamPlayerState {
    // Session info
    sessionId: string | null;
    examId: string | null;
    examTitle: string | null;
    currentSequenceIndex: number;
    totalQuestions: number;
    timeRemainingSeconds: number | null;
    isForwardOnly: boolean;
    isCompleted: boolean;
    startedAt: string | null;
    completedAt: string | null;

    // Question state
    activeQuestion: ActiveQuestionState | null;
    lockedQuestionIds: string[];
    answeredQuestionIds: string[];
    flaggedQuestionIds: string[];

    // UI state
    isSubmitting: boolean;
    isTimerPaused: boolean;
    error: string | null;
    lastSavedAt: string | null;

    // Stats
    answeredCount: number;
    lockedCount: number;
    flaggedCount: number;
    remainingQuestions: number;
}

const initialState: ExamPlayerState = {
    // Session info
    sessionId: null,
    examId: null,
    examTitle: null,
    currentSequenceIndex: 0,
    totalQuestions: 0,
    timeRemainingSeconds: null,
    isForwardOnly: true,
    isCompleted: false,
    startedAt: null,
    completedAt: null,

    // Question state
    activeQuestion: null,
    lockedQuestionIds: [],
    answeredQuestionIds: [],
    flaggedQuestionIds: [],

    // UI state
    isSubmitting: false,
    isTimerPaused: false,
    error: null,
    lastSavedAt: null,

    // Stats
    answeredCount: 0,
    lockedCount: 0,
    flaggedCount: 0,
    remainingQuestions: 0,
};

const examPlayerSlice = createSlice({
    name: 'examPlayer',
    initialState,
    reducers: {
        // Initialize exam session
        initializeSession: (
            state,
            action: PayloadAction<{
                sessionId: string;
                examId?: string;
                examTitle: string;
                totalQuestions: number;
                initialTimeRemainingSeconds: number | null;
                isForwardOnly?: boolean;
                startedAt?: string;
            }>
        ) => {
            const {
                sessionId,
                examId,
                examTitle,
                totalQuestions,
                initialTimeRemainingSeconds,
                isForwardOnly = true,
                startedAt = new Date().toISOString()
            } = action.payload;

            state.sessionId = sessionId;
            state.examId = examId || sessionId;
            state.examTitle = examTitle;
            state.totalQuestions = totalQuestions;
            state.timeRemainingSeconds = initialTimeRemainingSeconds;
            state.isForwardOnly = isForwardOnly;
            state.isCompleted = false;
            state.startedAt = startedAt;
            state.completedAt = null;
            state.currentSequenceIndex = 0;
            state.lockedQuestionIds = [];
            state.answeredQuestionIds = [];
            state.flaggedQuestionIds = [];
            state.answeredCount = 0;
            state.lockedCount = 0;
            state.flaggedCount = 0;
            state.remainingQuestions = totalQuestions;
            state.error = null;
            state.isSubmitting = false;
            state.isTimerPaused = false;
            state.activeQuestion = null;
            state.lastSavedAt = null;
        },

        // Set active question
        setActiveQuestion: (
            state,
            action: PayloadAction<ActiveQuestionState>
        ) => {
            state.activeQuestion = action.payload;
            state.currentSequenceIndex = action.payload.sequenceIndex;
        },

        // Navigate to question by index
        navigateToQuestion: (
            state,
            action: PayloadAction<{ sequenceIndex: number }>
        ) => {
            const { sequenceIndex } = action.payload;
            if (sequenceIndex >= 0 && sequenceIndex < state.totalQuestions) {
                state.currentSequenceIndex = sequenceIndex;
                // The active question will be loaded by the component
                // or through another action
            }
        },

        // Lock a question
        lockQuestion: (
            state,
            action: PayloadAction<string>
        ) => {
            const questionId = action.payload;
            if (!state.lockedQuestionIds.includes(questionId)) {
                state.lockedQuestionIds.push(questionId);
                state.lockedCount = state.lockedQuestionIds.length;
            }
            if (state.activeQuestion?.questionId === questionId) {
                state.activeQuestion = { ...state.activeQuestion, isLocked: true };
            }
        },

        // Unlock a question (if allowed)
        unlockQuestion: (
            state,
            action: PayloadAction<string>
        ) => {
            const questionId = action.payload;
            state.lockedQuestionIds = state.lockedQuestionIds.filter(id => id !== questionId);
            state.lockedCount = state.lockedQuestionIds.length;
            if (state.activeQuestion?.questionId === questionId) {
                state.activeQuestion = { ...state.activeQuestion, isLocked: false };
            }
        },

        // Mark question as answered
        markQuestionAnswered: (
            state,
            action: PayloadAction<{ questionId: string; answer?: any }>
        ) => {
            const { questionId } = action.payload;
            if (!state.answeredQuestionIds.includes(questionId)) {
                state.answeredQuestionIds.push(questionId);
                state.answeredCount = state.answeredQuestionIds.length;
                state.remainingQuestions = state.totalQuestions - state.answeredCount - state.lockedCount;
            }
            state.lastSavedAt = new Date().toISOString();
        },

        // Flag question for review
        flagQuestion: (
            state,
            action: PayloadAction<string>
        ) => {
            const questionId = action.payload;
            if (!state.flaggedQuestionIds.includes(questionId)) {
                state.flaggedQuestionIds.push(questionId);
                state.flaggedCount = state.flaggedQuestionIds.length;
            } else {
                // Unflag if already flagged
                state.flaggedQuestionIds = state.flaggedQuestionIds.filter(id => id !== questionId);
                state.flaggedCount = state.flaggedQuestionIds.length;
            }
        },

        // Update timer
        decrementTimer: (state) => {
            if (state.timeRemainingSeconds !== null && state.timeRemainingSeconds > 0) {
                state.timeRemainingSeconds -= 1;
                if (state.timeRemainingSeconds === 0) {
                    // Auto-submit when timer reaches 0
                    state.isCompleted = true;
                    state.completedAt = new Date().toISOString();
                }
            } else if (state.timeRemainingSeconds === 0) {
                // Already at 0
            } else {
                // Timer was null, keep it null
            }
        },

        // Pause timer
        pauseTimer: (state) => {
            state.isTimerPaused = true;
        },

        // Resume timer
        resumeTimer: (state) => {
            state.isTimerPaused = false;
        },

        // Set timer
        setTimer: (
            state,
            action: PayloadAction<number | null>
        ) => {
            state.timeRemainingSeconds = action.payload;
        },

        // Complete exam
        completeExam: (state) => {
            state.isCompleted = true;
            state.completedAt = new Date().toISOString();
            state.isTimerPaused = true;
        },

        // Reset exam session
        resetSession: (state) => {
            state.sessionId = null;
            state.examId = null;
            state.examTitle = null;
            state.currentSequenceIndex = 0;
            state.totalQuestions = 0;
            state.timeRemainingSeconds = null;
            state.activeQuestion = null;
            state.lockedQuestionIds = [];
            state.answeredQuestionIds = [];
            state.flaggedQuestionIds = [];
            state.isForwardOnly = true;
            state.isCompleted = false;
            state.startedAt = null;
            state.completedAt = null;
            state.isSubmitting = false;
            state.isTimerPaused = false;
            state.error = null;
            state.lastSavedAt = null;
            state.answeredCount = 0;
            state.lockedCount = 0;
            state.flaggedCount = 0;
            state.remainingQuestions = 0;
        },

        // Set submitting state
        setSubmitting: (
            state,
            action: PayloadAction<boolean>
        ) => {
            state.isSubmitting = action.payload;
        },

        // Set error
        setError: (
            state,
            action: PayloadAction<string | null>
        ) => {
            state.error = action.payload;
        },

        // Update stats
        updateStats: (state) => {
            state.answeredCount = state.answeredQuestionIds.length;
            state.lockedCount = state.lockedQuestionIds.length;
            state.flaggedCount = state.flaggedQuestionIds.length;
            state.remainingQuestions = state.totalQuestions - state.answeredCount - state.lockedCount;
        },

        // Bulk update for loading from API
        loadSessionState: (
            state,
            action: PayloadAction<{
                sessionId: string;
                examId?: string;
                examTitle: string;
                totalQuestions: number;
                currentSequenceIndex: number;
                timeRemainingSeconds: number | null;
                isForwardOnly: boolean;
                isCompleted: boolean;
                startedAt: string | null;
                completedAt: string | null;
                lockedQuestionIds: string[];
                answeredQuestionIds: string[];
                flaggedQuestionIds: string[];
            }>
        ) => {
            const {
                sessionId,
                examId,
                examTitle,
                totalQuestions,
                currentSequenceIndex,
                timeRemainingSeconds,
                isForwardOnly,
                isCompleted,
                startedAt,
                completedAt,
                lockedQuestionIds,
                answeredQuestionIds,
                flaggedQuestionIds
            } = action.payload;

            state.sessionId = sessionId;
            state.examId = examId || sessionId;
            state.examTitle = examTitle;
            state.totalQuestions = totalQuestions;
            state.currentSequenceIndex = currentSequenceIndex;
            state.timeRemainingSeconds = timeRemainingSeconds;
            state.isForwardOnly = isForwardOnly;
            state.isCompleted = isCompleted;
            state.startedAt = startedAt;
            state.completedAt = completedAt;
            state.lockedQuestionIds = lockedQuestionIds;
            state.answeredQuestionIds = answeredQuestionIds;
            state.flaggedQuestionIds = flaggedQuestionIds;

            // Update stats
            state.answeredCount = answeredQuestionIds.length;
            state.lockedCount = lockedQuestionIds.length;
            state.flaggedCount = flaggedQuestionIds.length;
            state.remainingQuestions = totalQuestions - answeredQuestionIds.length - lockedQuestionIds.length;
        },

        // Save answer (optimistic update)
        saveAnswer: (
            state,
            action: PayloadAction<{
                questionId: string;
                answer: any;
            }>
        ) => {
            // This is an optimistic update - the actual answer will be saved to the backend
            // and confirmed via API response
            state.lastSavedAt = new Date().toISOString();

            // Mark as answered if not already
            const { questionId } = action.payload;
            if (!state.answeredQuestionIds.includes(questionId)) {
                state.answeredQuestionIds.push(questionId);
                state.answeredCount = state.answeredQuestionIds.length;
                state.remainingQuestions = state.totalQuestions - state.answeredCount - state.lockedCount;
            }
        },
    },
});

// Export actions
export const {
    initializeSession,
    setActiveQuestion,
    navigateToQuestion,
    lockQuestion,
    unlockQuestion,
    markQuestionAnswered,
    flagQuestion,
    decrementTimer,
    pauseTimer,
    resumeTimer,
    setTimer,
    completeExam,
    resetSession,
    setSubmitting,
    setError,
    updateStats,
    loadSessionState,
    saveAnswer,
} = examPlayerSlice.actions;

// Selectors
export const selectExamSession = (state: { examPlayer: ExamPlayerState }) => state.examPlayer;
export const selectActiveQuestion = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.activeQuestion;
export const selectCurrentSequenceIndex = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.currentSequenceIndex;
export const selectTotalQuestions = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.totalQuestions;
export const selectTimeRemaining = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.timeRemainingSeconds;
export const selectIsCompleted = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.isCompleted;
export const selectIsForwardOnly = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.isForwardOnly;
export const selectLockedQuestionIds = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.lockedQuestionIds;
export const selectAnsweredQuestionIds = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.answeredQuestionIds;
export const selectFlaggedQuestionIds = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.flaggedQuestionIds;
export const selectAnsweredCount = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.answeredCount;
export const selectLockedCount = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.lockedCount;
export const selectFlaggedCount = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.flaggedCount;
export const selectRemainingQuestions = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.remainingQuestions;
export const selectIsSubmitting = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.isSubmitting;
export const selectIsTimerPaused = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.isTimerPaused;
export const selectError = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.error;
export const selectLastSavedAt = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.lastSavedAt;
export const selectSessionId = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.sessionId;
export const selectExamTitle = (state: { examPlayer: ExamPlayerState }) => state.examPlayer.examTitle;

export default examPlayerSlice.reducer;