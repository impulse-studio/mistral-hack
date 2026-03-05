import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function SignInGoogleIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
			<path
				d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
				fill="#4285F4"
			/>
			<path
				d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
				fill="#34A853"
			/>
			<path
				d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
				fill="#FBBC05"
			/>
			<path
				d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z"
				fill="#EA4335"
			/>
		</svg>
	);
}

function SignInGithubIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M9 0C4.03 0 0 4.03 0 9c0 3.978 2.579 7.35 6.154 8.543.45.083.614-.195.614-.433 0-.213-.008-.78-.012-1.53-2.503.544-3.032-1.206-3.032-1.206-.41-1.04-1-1.317-1-1.317-.816-.558.062-.546.062-.546.903.063 1.378.927 1.378.927.802 1.374 2.105.977 2.617.747.082-.581.314-.977.571-1.201-1.998-.227-4.1-1-4.1-4.448 0-.983.351-1.786.927-2.416-.093-.228-.402-1.143.088-2.382 0 0 .756-.242 2.475.923A8.631 8.631 0 0 1 9 4.365a8.63 8.63 0 0 1 2.258.304c1.718-1.165 2.473-.923 2.473-.923.491 1.24.182 2.154.089 2.382.577.63.926 1.433.926 2.416 0 3.457-2.105 4.218-4.11 4.44.323.278.611.828.611 1.668 0 1.204-.01 2.175-.01 2.471 0 .24.162.52.619.432C15.424 16.347 18 12.975 18 9c0-4.97-4.03-9-9-9Z"
			/>
		</svg>
	);
}

export function SignInForm() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({ to: "/office" });
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	const signInSocialHandler = async (provider: "google" | "github") => {
		await authClient.signIn.social(
			{ provider, callbackURL: "/office" },
			{
				onError: (error) => {
					toast.error(error.error.message || error.error.statusText);
				},
			},
		);
	};

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
						Welcome back
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">Log in to your account to continue.</p>

					{/* Form */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="mt-8 space-y-5"
					>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label
										htmlFor={field.name}
										className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground"
									>
										Email Address
									</Label>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										placeholder="paul@email.com"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="h-12 border-2 border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50"
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="font-mono text-xs text-destructive">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="password">
							{(field) => (
								<div className="space-y-2">
									<Label
										htmlFor={field.name}
										className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground"
									>
										Password
									</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										placeholder="••••••••"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="h-12 border-2 border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50"
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="font-mono text-xs text-destructive">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									variant="default"
									size="lg"
									disabled={!state.canSubmit || state.isSubmitting}
									className="h-12 w-full border-foreground bg-foreground font-mono text-sm font-semibold uppercase tracking-widest text-background"
								>
									{state.isSubmitting ? "Signing in..." : "Log in"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					{/* Separator */}
					<div className="my-6 border-t-2 border-border" />

					{/* Social login buttons */}
					<div className="space-y-3">
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => signInSocialHandler("google")}
							className="h-12 w-full font-mono text-sm tracking-wide"
						>
							<SignInGoogleIcon />
							<span className="ml-3">Log in with Google</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => signInSocialHandler("github")}
							className="h-12 w-full font-mono text-sm tracking-wide"
						>
							<SignInGithubIcon />
							<span className="ml-3">Log in with GitHub</span>
						</Button>
					</div>
				</div>

				{/* Registration disabled */}
				<p className="mt-6 text-center text-sm text-muted-foreground">
					Sign-ups are currently closed. Existing users only.
				</p>
			</div>
		</div>
	);
}
