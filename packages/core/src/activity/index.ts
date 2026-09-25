/**
 * Activity-proposal domain foundations: time intervals, participation,
 * declared costs, equipment coverage and compatibility matching.
 *
 * Pure functions only, and intentionally not re-exported from the package
 * root: nothing in a route, service or repository uses this yet, and none of
 * it grants or changes a permission. See docs/ACTIVITY_PROPOSALS.md for the
 * policy decisions that must be settled before it is wired in.
 */
export * from './interval';
export * from './participation';
export * from './cost';
export * from './equipment';
export * from './match';
export * from './describe';
