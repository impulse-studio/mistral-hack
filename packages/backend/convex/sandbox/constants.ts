// Single source of truth for all Daytona sandbox paths.
// Daytona sandboxes run as user "daytona" with home at /home/daytona.
export const SANDBOX_HOME = "/home/daytona";
export const SANDBOX_WORK_DIR = "/home/daytona";
// Local path for scaffolding/npm install — avoids FUSE volume ENOSYS on rename.
// Copy finished projects to SHARED_WORKSPACE when ready to share.
export const SANDBOX_LOCAL_WORKSPACE = "/home/daytona/projects";
export const SHARED_WORKSPACE = "/home/company";
export const SHARED_OUTPUTS = "/home/company/outputs";
export const SANDBOX_GIT_USER = "AI Office Agent";
export const SANDBOX_GIT_EMAIL = "agent@ai-office.dev";

export const CODER_SNAPSHOT_NAME = "ai-office-coder";
