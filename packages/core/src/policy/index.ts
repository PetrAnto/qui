/**
 * The single place where "is this allowed?" is answered.
 *
 * Route handlers, server components, seeds and future queue consumers all call
 * these functions. Re-deriving a rule anywhere else is a review-blocking defect
 * (see AGENTS.md).
 */
export * from './decision';
export * from './graph';
export * from './age';
export * from './capabilities';
export * from './access';
export * from './interaction';
