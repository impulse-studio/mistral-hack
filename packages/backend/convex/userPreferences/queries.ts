import { query } from "../_generated/server";
import { authComponent } from "../auth";

/** Returns whether the current user has completed onboarding. */
export const isOnboardingCompleted = query({
	args: {},
	handler: async (ctx): Promise<boolean> => {
		const authUser = await authComponent.safeGetAuthUser(ctx);
		if (!authUser) return true; // not logged in → don't show onboarding

		const prefs = await ctx.db
			.query("userPreferences")
			.withIndex("by_user", (q) => q.eq("userId", authUser._id))
			.unique();

		return prefs?.onboardingCompleted ?? false;
	},
});
