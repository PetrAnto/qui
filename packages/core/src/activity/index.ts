/**
 * Activity-proposal domain: time intervals, participation, declared costs,
 * equipment coverage, compatibility matching, search input and the proposal
 * preview.
 *
 * Pure functions only. None of it grants or changes a permission. The search
 * service (`services/search.ts`) is the one caller that reaches the product,
 * and it only reads; publishing a proposal still awaits the policy decisions
 * in docs/ACTIVITY_PROPOSALS.md.
 */
export * from './interval';
export * from './participation';
export * from './cost';
export * from './equipment';
export * from './match';
export * from './describe';
export * from './search-input';
export * from './preview';
