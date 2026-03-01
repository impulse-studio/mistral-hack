// Shared context type for per-role runner functions.
// These are plain helper functions (not Convex actions), so they receive
// the ctx object passed down from the top-level internalAction dispatcher.
export type RunnerCtx = {
	runAction: CallableFunction;
	runMutation: CallableFunction;
	runQuery: CallableFunction;
};

// Explicit result type from role runners — eliminates fragile regex-based
// success detection in the main runner.
export type RunnerResult = {
	success: boolean;
	result: string;
	continuation?: {
		messages: string; // JSON-serialized Array<ResponseMessage>
		stepsCompleted: number;
		continuationCount: number;
	};
};
