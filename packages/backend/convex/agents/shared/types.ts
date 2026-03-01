// Shared context type for per-role runner functions.
// These are plain helper functions (not Convex actions), so they receive
// the ctx object passed down from the top-level internalAction dispatcher.
export type RunnerCtx = {
	runAction: CallableFunction;
	runMutation: CallableFunction;
	runQuery: CallableFunction;
};
