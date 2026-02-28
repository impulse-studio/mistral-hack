import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignUpForm } from "@/components/SignUpForm.component";

export const Route = createFileRoute("/sign-up")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/office" });
		}
	},
	component: SignUpPage,
});

function SignUpPage() {
	return <SignUpForm />;
}
