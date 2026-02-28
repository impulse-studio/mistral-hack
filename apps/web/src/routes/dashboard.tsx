import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useState } from "react";

import { SignInForm } from "@/components/SignInForm";
import { SignUpForm } from "@/components/SignUpForm";
import { UserMenu } from "@/components/UserMenu";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const [showSignIn, setShowSignIn] = useState(false);
	const privateData = useQuery(api.privateData.get);

	return (
		<>
			<Authenticated>
				<div>
					<h1>Dashboard</h1>
					<p>privateData: {privateData?.message}</p>
					<UserMenu />
				</div>
			</Authenticated>
			<Unauthenticated>
				{showSignIn ? (
					<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
				) : (
					<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
				)}
			</Unauthenticated>
			<AuthLoading>
				<div>Loading...</div>
			</AuthLoading>
		</>
	);
}
