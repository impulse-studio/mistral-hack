import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";

export function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/office", label: "Office" },
		{ to: "/ai", label: "AI Chat" },
		{ to: "/test", label: "Debug Daytona" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<Authenticated>
						<UserMenu />
					</Authenticated>
					<Unauthenticated>
						<Link to="/sign-in">
							<Button variant="outline" className="font-mono text-xs uppercase tracking-widest">
								Log in
							</Button>
						</Link>
					</Unauthenticated>
				</div>
			</div>
			<hr />
		</div>
	);
}
