import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import { HeroIllustration } from "@/components/HeroIllustration.component";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/office" });
		}
	},
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="flex flex-col">
			{/* Hero Section */}
			<section className="relative flex min-h-svh items-center overflow-hidden">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-12 px-6 py-16">
					{/* Left — Text Content */}
					<div className="flex max-w-lg flex-col gap-8">
						{/* Title */}
						<h1 className="font-mono text-5xl leading-[1.1] font-bold uppercase tracking-tight text-foreground">
							Your AI team,
							<br />
							<span className="text-brand-accent">one office</span>
							<br />
							away.
						</h1>

						{/* Subtitle */}
						<p className="max-w-md text-sm leading-relaxed text-muted-foreground">
							A virtual pixel-art office where AI agents collaborate in real-time. Assign tasks,
							watch them code, and ship faster — all orchestrated by a single manager.
						</p>

						{/* CTA */}
						<Link to="/sign-in">
							<Button
								variant="accent"
								size="lg"
								className="px-5 font-mono text-xs font-semibold uppercase tracking-widest"
							>
								Enter the office
								<span className="ml-1">&rarr;</span>
							</Button>
						</Link>
					</div>

					{/* Right — Pixel Art Illustration */}
					<div className="hidden lg:block">
						<HeroIllustration />
					</div>
				</div>
			</section>

			{/* Tech strip */}
			<section className="border-t-2 border-border bg-card/50">
				<div className="mx-auto flex max-w-4xl items-center justify-center gap-10 px-6 py-4">
					{["Mistral AI", "Convex", "Daytona", "React 19", "Pixel Art"].map((name) => (
						<span
							key={name}
							className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
						>
							{name}
						</span>
					))}
				</div>
			</section>
		</div>
	);
}
