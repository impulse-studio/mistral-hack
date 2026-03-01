export type SandboxCapability =
	| "shell"
	| "vibe"
	| "git"
	| "deploy"
	| "computerUse"
	| "github"
	| "filesystem"
	| "web";

export const roleCapabilities: Record<string, SandboxCapability[]> = {
	coder: ["shell", "vibe", "git", "deploy", "github", "filesystem", "web"],
	browser: ["shell", "computerUse", "filesystem"],
	designer: ["shell", "computerUse", "filesystem"],
	researcher: ["shell", "git", "filesystem", "web"],
	copywriter: ["shell", "filesystem", "web"],
	general: ["shell", "git", "deploy", "github", "filesystem", "web"],
};

/** Check if a role has a specific capability */
export function roleHas(role: string, cap: SandboxCapability): boolean {
	return roleCapabilities[role]?.includes(cap) ?? false;
}
