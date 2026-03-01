export type SandboxCapability =
	| "shell"
	| "vibe"
	| "git"
	| "deploy"
	| "computerUse"
	| "github"
	| "filesystem";

export const roleCapabilities: Record<string, SandboxCapability[]> = {
	coder: ["shell", "vibe", "git", "deploy", "github", "filesystem"],
	browser: ["shell", "computerUse", "filesystem"],
	designer: ["shell", "computerUse", "filesystem"],
	researcher: ["shell", "git", "filesystem"],
	copywriter: ["shell", "filesystem"],
	general: ["shell", "git", "deploy", "github", "filesystem"],
};

/** Check if a role has a specific capability */
export function roleHas(role: string, cap: SandboxCapability): boolean {
	return roleCapabilities[role]?.includes(cap) ?? false;
}
