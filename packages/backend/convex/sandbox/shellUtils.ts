// Shell escaping — POSIX single-quote strategy
// Separate file to avoid pulling @daytonaio/sdk into non-Node bundles

export function escapeShellArg(arg: string): string {
	// Wrap in single quotes, escaping any existing single quotes via '\''
	return `'${arg.replace(/'/g, "'\\''")}'`;
}
