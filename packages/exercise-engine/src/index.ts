export type SessionState =
  | 'IDLE'
  | 'LOADING_SESSION'
  | 'READY'
  | 'EXERCISE_INTRO'
  | 'AWAITING_SIGNAL'
  | 'LISTENING'
  | 'ANALYZING'
  | 'RESULT_REVIEW'
  | 'SESSION_COMPLETE'
  | 'SESSION_ERROR';

export const initialSessionState: SessionState = 'IDLE';
