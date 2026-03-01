import { mutation } from "../_generated/server";
import { authComponent } from "../auth";

/** Mark onboarding as completed for the current user. */
export const completeOnboarding = mutation({
	args: {},
	handler: async (ctx) => {
		const authUser = await authComponent.safeGetAuthUser(ctx);
		if (!authUser) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("userPreferences")
			.withIndex("by_user", (q) => q.eq("userId", authUser._id))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { onboardingCompleted: true });
		} else {
			await ctx.db.insert("userPreferences", {
				userId: authUser._id,
				onboardingCompleted: true,
			});
		}
	},
});
