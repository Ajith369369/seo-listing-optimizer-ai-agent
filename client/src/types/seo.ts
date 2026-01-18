/**
 * Discriminated Union pattern for SEO optimization state
 * Ensures type safety and prevents invalid state combinations
 */

// Base interface for all states
interface BaseSEOState {
  id: string;
  originalTitle: string;
  taskType: 'seo_optimization';
}

// Initial state - user hasn't started optimization
export interface IdleState extends BaseSEOState {
  status: 'idle';
}

// Loading state - AI is processing
export interface LoadingState extends BaseSEOState {
  status: 'loading';
}

// Success state - AI returned results, awaiting review
export interface ReviewRequiredState extends BaseSEOState {
  status: 'review_required';
  optimizedTitle: string;
  keywords: string[];
  reasoning: string;
  editableTitle: string; // User can edit before approving
}

// Error state - something went wrong
export interface ErrorState extends BaseSEOState {
  status: 'error';
  errorType: 'timeout' | 'rate_limit' | 'api_error' | 'network_error';
  errorMessage: string;
  retryCount: number;
}

// Approved state - user approved the optimization
export interface ApprovedState extends BaseSEOState {
  status: 'approved';
  optimizedTitle: string;
  keywords: string[];
  approvedAt: Date;
}

// Manual entry state - user chose to enter manually
export interface ManualEntryState extends BaseSEOState {
  status: 'manual_entry';
  manualTitle: string;
  manualKeywords: string[];
}

// Discriminated union type
export type SEOState =
  | IdleState
  | LoadingState
  | ReviewRequiredState
  | ErrorState
  | ApprovedState
  | ManualEntryState;

// Type guards
export function isIdleState(state: SEOState): state is IdleState {
  return state.status === 'idle';
}

export function isLoadingState(state: SEOState): state is LoadingState {
  return state.status === 'loading';
}

export function isReviewRequiredState(state: SEOState): state is ReviewRequiredState {
  return state.status === 'review_required';
}

export function isErrorState(state: SEOState): state is ErrorState {
  return state.status === 'error';
}

export function isApprovedState(state: SEOState): state is ApprovedState {
  return state.status === 'approved';
}

export function isManualEntryState(state: SEOState): state is ManualEntryState {
  return state.status === 'manual_entry';
}
