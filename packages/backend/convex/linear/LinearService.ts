"use node";

import { LinearClient, type Issue } from "@linear/sdk";

// ── Types ────────────────────────────────────────────────

export interface NormalizedIssue {
	id: string;
	identifier: string;
	title: string;
	description?: string;
	priority: number;
	priorityLabel: string;
	url: string;
	createdAt: string;
	updatedAt: string;
	state?: { name: string; type: string };
	assignee?: { name: string; email: string };
	labels: string[];
	project?: { name: string };
	team?: { name: string; key: string };
}

export interface NormalizedTeam {
	id: string;
	name: string;
	key: string;
	description?: string;
	issueCount: number;
}

export interface ListIssuesOpts {
	teamId: string;
	statusType?: string;
	projectName?: string;
	assigneeName?: string;
	labelName?: string;
	limit?: number;
}

// ── Service ──────────────────────────────────────────────

export class LinearService {
	private readonly client: LinearClient;

	constructor(apiKey: string) {
		if (!apiKey) throw new Error("[LinearService] Missing API key");
		this.client = new LinearClient({ apiKey });
	}

	/** Fetch a single issue by identifier ("ENG-123") or UUID. */
	async getIssue(issueId: string): Promise<NormalizedIssue> {
		const issues = await this.client.issueSearch({ query: issueId, first: 1 });
		const issue = issues.nodes[0];
		if (!issue) throw new Error(`Issue "${issueId}" not found`);
		return this.normalizeIssue(issue);
	}

	/** List issues with filters, scoped to a team. */
	async listIssues(opts: ListIssuesOpts): Promise<NormalizedIssue[]> {
		const filter: Record<string, unknown> = {
			team: { id: { eq: opts.teamId } },
		};

		if (opts.statusType) {
			filter.state = { type: { eq: opts.statusType } };
		}
		if (opts.assigneeName) {
			filter.assignee = { name: { containsIgnoreCase: opts.assigneeName } };
		}
		if (opts.labelName) {
			filter.labels = { name: { containsIgnoreCase: opts.labelName } };
		}
		if (opts.projectName) {
			filter.project = { name: { containsIgnoreCase: opts.projectName } };
		}

		const issues = await this.client.issues({
			first: opts.limit ?? 25,
			filter,
		});

		return Promise.all(issues.nodes.map((i) => this.normalizeIssue(i)));
	}

	/** Search issues by text, optionally scoped to a team. */
	async searchIssues(
		query: string,
		opts?: { teamId?: string; limit?: number },
	): Promise<NormalizedIssue[]> {
		const filter: Record<string, unknown> = {};
		if (opts?.teamId) {
			filter.team = { id: { eq: opts.teamId } };
		}

		const issues = await this.client.issueSearch({
			query,
			first: opts?.limit ?? 25,
			filter: Object.keys(filter).length > 0 ? filter : undefined,
		});

		return Promise.all(issues.nodes.map((i) => this.normalizeIssue(i)));
	}

	/** List all teams (for setup). */
	async listTeams(): Promise<NormalizedTeam[]> {
		const teams = await this.client.teams();
		return teams.nodes.map((t) => ({
			id: t.id,
			name: t.name,
			key: t.key,
			description: t.description ?? undefined,
			issueCount: t.issueCount,
		}));
	}

	/** Get details of a specific team. */
	async getTeam(teamId: string): Promise<NormalizedTeam> {
		const team = await this.client.team(teamId);
		return {
			id: team.id,
			name: team.name,
			key: team.key,
			description: team.description ?? undefined,
			issueCount: team.issueCount,
		};
	}

	// ── Private ──────────────────────────────────────────

	private async normalizeIssue(issue: Issue): Promise<NormalizedIssue> {
		const [state, assignee, labelsConn, project, team] = await Promise.all([
			issue.state,
			issue.assignee,
			issue.labels(),
			issue.project,
			issue.team,
		]);

		return {
			id: issue.id,
			identifier: issue.identifier,
			title: issue.title,
			description: issue.description ?? undefined,
			priority: issue.priority,
			priorityLabel: issue.priorityLabel,
			url: issue.url,
			createdAt: issue.createdAt.toISOString(),
			updatedAt: issue.updatedAt.toISOString(),
			state: state ? { name: state.name, type: state.type } : undefined,
			assignee: assignee ? { name: assignee.name, email: assignee.email } : undefined,
			labels: labelsConn.nodes.map((l) => l.name),
			project: project ? { name: project.name } : undefined,
			team: team ? { name: team.name, key: team.key } : undefined,
		};
	}
}

// ── Factory (singleton per action invocation) ────────────

let _instance: LinearService | null = null;

export function getLinear(): LinearService {
	if (!_instance) {
		const apiKey = process.env.LINEAR_API_KEY;
		if (!apiKey) throw new Error("LINEAR_API_KEY environment variable is not set");
		_instance = new LinearService(apiKey);
	}
	return _instance;
}
