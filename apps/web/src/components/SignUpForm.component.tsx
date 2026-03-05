import { Link } from "@tanstack/react-router";

import { Button } from "./ui/button";

export function SignUpForm() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-background px-4">
			<div className="w-full max-w-md">
				{/* Back link */}
				<Link
					to="/"
					className="mb-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
				>
					<span>&larr;</span> Back
				</Link>

				{/* Card */}
				<div className="border-2 border-border bg-card p-8 shadow-pixel inset-shadow-pixel">
					{/* Header */}
					<h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
						Create account
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">Sign up to get started.</p>

					{/* Disabled notice */}
					<div className="mt-8 border-2 border-border bg-muted/50 p-6 text-center">
						<p className="font-mono text-sm font-semibold text-foreground">
							Sign-ups are currently disabled
						</p>
						<p className="mt-2 text-sm text-muted-foreground">
							Only existing users can sign in. Registration is closed.
						</p>
					</div>

					{/* Sign in redirect */}
					<div className="mt-6">
						<Link to="/sign-in">
							<Button
								type="button"
								variant="default"
								size="lg"
								className="h-12 w-full border-foreground bg-foreground font-mono text-sm font-semibold uppercase tracking-widest text-background"
							>
								Go to sign in
							</Button>
						</Link>
					</div>
				</div>

				{/* Bottom link */}
				<p className="mt-6 text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/sign-in"
						className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-brand-accent"
					>
						Log in
					</Link>
				</p>
			</div>
		</div>
	);
}
