import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";

import { Header } from "../components/Header";
import appCss from "../index.css?url";
import type { RouterAppContext } from "../router";

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
	beforeLoad: async () => {
		if (typeof window === "undefined") {
			return { isAuthenticated: false, token: null };
		}
		const { data: session } = await authClient.getSession();
		return {
			isAuthenticated: !!session,
			token: null,
		};
	},
});

function RootDocument() {
	const context = useRouteContext({ from: Route.id });
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	const hideHeaderRoutes = ["/", "/sign-in", "/sign-up", "/office"];
	const showHeader = !hideHeaderRoutes.includes(pathname);
	return (
		<ConvexBetterAuthProvider
			client={context.convexQueryClient.convexClient}
			authClient={authClient}
			initialToken={context.token ?? undefined}
		>
			<html lang="en" className="dark">
				<head>
					<HeadContent />
					{import.meta.env.DEV && (
						<script src="//unpkg.com/react-grab/dist/index.global.js" crossOrigin="anonymous" />
					)}
				</head>
				<body>
					<div className={showHeader ? "grid h-svh grid-rows-[auto_1fr]" : "h-svh"}>
						{showHeader && <Header />}
						<Outlet />
					</div>
					<Toaster richColors />
					<TanStackRouterDevtools position="bottom-left" />
					<Scripts />
				</body>
			</html>
		</ConvexBetterAuthProvider>
	);
}
