import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const get = query({
	args: {},
	returns: v.object({ message: v.string() }),
	handler: async (ctx) => {
		const authUser = await authComponent.safeGetAuthUser(ctx);
		if (!authUser) {
			return {
				message: "Not authenticated",
			};
		}
		return {
			message: "This is private",
		};
	},
});
