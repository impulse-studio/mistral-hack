import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignInForm } from "@/components/SignInForm.component";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/office" });
		}
	},
	component: SignInPage,
});

function SignInPage() {
	return <SignInForm />;
}
