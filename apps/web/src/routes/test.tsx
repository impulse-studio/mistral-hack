import {
	useUIMessages as useUIMessagesRaw,
	useSmoothText,
	type UIMessage,
} from "@convex-dev/agent/react";
import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, type UsePaginatedQueryResult } from "convex/react";
import { Send, Loader, Monitor, Users, Plus, Reload, Circle } from "pixelarticons/react";
import { useRef, useEffect, useState } from "react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Typed wrapper — @convex-dev/agent@0.6.0-alpha generic inference is broken
const useUIMessages = useUIMessagesRaw as (
	query: typeof api.chat.listMessages,
	args: { threadId: string } | "skip",
	options: { initialNumItems: number; stream?: boolean },
) => UsePaginatedQueryResult<UIMessage>;

export const Route = createFileRoute("/test")({
	component: TestDashboard,
});

// ── Chat Message ──────────────────────────────────────────────

function MessageText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});
	return <Streamdown>{visibleText}</Streamdown>;
}

// ── Manager Chat Panel ────────────────────────────────────────

function ManagerChat() {
	const [input, setInput] = useState("");
	const [threadId, setThreadId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const createThread = useMutation(api.chat.createNewThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- useUIMessages overload doesn't narrow union correctly
		(threadId ? { threadId } : "skip") as any,
		{ initialNumItems: 50, stream: true },
	);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const hasStreamingMessage = messages?.some((m: UIMessage) => m.status === "streaming");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const text = input.trim();
		if (!text || isLoading) return;

		setIsLoading(true);
		setInput("");

		try {
			let currentThreadId = threadId;
			if (!currentThreadId) {
				currentThreadId = await createThread();
				setThreadId(currentThreadId);
			}
			await sendMessage({ threadId: currentThreadId, prompt: text });
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="h-full">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2">
					<Monitor className="h-4 w-4" />
					Manager Chat
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col h-[calc(100%-3.5rem)] p-0">
				<div className="flex-1 overflow-y-auto space-y-3 p-4">
					{!messages || messages.length === 0 ? (
						<p className="text-center text-muted-foreground text-xs mt-8">
							Send a message to the Manager agent
						</p>
					) : (
						messages.map((message: UIMessage) => (
							<div
								key={message.key}
								className={`p-2 rounded text-xs ${
									message.role === "user" ? "bg-primary/10 ml-6" : "bg-secondary/20 mr-6"
								}`}
							>
								<p className="font-semibold mb-1">{message.role === "user" ? "You" : "Manager"}</p>
								<MessageText
									text={message.text ?? ""}
									isStreaming={message.status === "streaming"}
								/>
							</div>
						))
					)}
					{isLoading && !hasStreamingMessage && (
						<div className="p-2 rounded bg-secondary/20 mr-6">
							<div className="flex items-center gap-2 text-muted-foreground text-xs">
								<Loader className="h-3 w-3 animate-spin" />
								Thinking...
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Message the Manager..."
						className="flex-1 text-xs"
						autoComplete="off"
						disabled={isLoading}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={isLoading || !input.trim()}
						className="h-8 w-8"
					>
						{isLoading ? <Loader className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

// ── Status dot helper ─────────────────────────────────────────

const statusColors: Record<string, string> = {
	idle: "bg-gray-400",
	thinking: "bg-yellow-400 animate-pulse",
	working: "bg-green-400 animate-pulse",
	completed: "bg-blue-400",
	failed: "bg-red-400",
	despawning: "bg-orange-400",
	// sandbox statuses
	running: "bg-green-400",
	stopped: "bg-gray-400",
	creating: "bg-yellow-400 animate-pulse",
	archived: "bg-gray-600",
	error: "bg-red-400",
};

function StatusDot({ status }: { status: string }) {
	return (
		<span
			className={`inline-block h-2 w-2 rounded-full ${statusColors[status] ?? "bg-gray-400"}`}
		/>
	);
}

interface ConvexDesk {
	_id: string;
	position: { x: number; y: number };
	label?: string;
	occupiedBy?: string;
}

interface ConvexAgent {
	_id: string;
	name: string;
	type: string;
	role: string;
	status: string;
	deskId?: string;
}

interface ConvexTask {
	_id: string;
	title: string;
	description?: string;
	status: string;
	assignedTo?: string;
}

// ── Office State Panel ────────────────────────────────────────

function OfficeState() {
	const officeState = useQuery(api.office.queries.getOfficeState);
	const sandboxStatus = useQuery(api.sandbox.queries.getStatus);
	const allSandboxes = useQuery(api.sandbox.queries.getAllSandboxes);
	const initDesks = useMutation(api.office.mutations.initDesks);
	const [isIniting, setIsIniting] = useState(false);

	const handleInitDesks = async () => {
		setIsIniting(true);
		try {
			await initDesks();
		} catch (error) {
			console.error("Failed to init desks:", error);
		} finally {
			setIsIniting(false);
		}
	};

	const desks = officeState?.desks ?? [];
	const agents = officeState?.agents ?? [];

	return (
		<Card className="h-full">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						Office State
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={handleInitDesks}
						disabled={isIniting}
						className="h-7 text-xs"
					>
						{isIniting ? (
							<Loader className="h-3 w-3 animate-spin mr-1" />
						) : (
							<Reload className="h-3 w-3 mr-1" />
						)}
						Init Desks
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="overflow-y-auto h-[calc(100%-3.5rem)] p-4 space-y-4">
				{/* Sandbox Status — per-agent sandboxes */}
				<div className="rounded border p-3">
					<h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
						<Circle className="h-3 w-3" />
						Sandboxes
						{sandboxStatus && "count" in sandboxStatus && (
							<span className="text-muted-foreground font-normal">
								({sandboxStatus.runningCount}/{sandboxStatus.count} running)
							</span>
						)}
					</h3>
					{allSandboxes && allSandboxes.length > 0 ? (
						<div className="space-y-2">
							{allSandboxes.map(
								(sb: {
									_id: string;
									status: string;
									agentName: string | null;
									agentRole: string | null;
									name?: string | null;
									diskUsage?: string | null;
									error?: string | null;
								}) => (
									<div key={sb._id} className="flex items-center justify-between text-xs">
										<div className="flex items-center gap-2">
											<StatusDot status={sb.status} />
											<span className="font-medium">
												{sb.agentName ?? sb.name ?? sb._id.slice(-6)}
											</span>
										</div>
										<div className="flex items-center gap-2 text-muted-foreground">
											{sb.agentRole && <span>{sb.agentRole}</span>}
											<span className="capitalize">{sb.status}</span>
										</div>
									</div>
								),
							)}
						</div>
					) : sandboxStatus && sandboxStatus.status !== "none" ? (
						<div className="text-xs">
							<div className="flex items-center gap-2">
								<StatusDot status={sandboxStatus.status} />
								<span className="capitalize">{sandboxStatus.status}</span>
							</div>
						</div>
					) : (
						<p className="text-xs text-muted-foreground">No sandboxes provisioned</p>
					)}
				</div>

				{/* Agents Summary */}
				<div className="rounded border p-3">
					<h3 className="text-xs font-semibold mb-2">
						Active Agents (
						{
							agents.filter(
								(a: ConvexAgent) => a.status !== "completed" && a.status !== "despawning",
							).length
						}
						)
					</h3>
					{agents.length === 0 ? (
						<p className="text-xs text-muted-foreground">No agents spawned</p>
					) : (
						<div className="space-y-2">
							{agents.map((agent: ConvexAgent) => (
								<div key={agent._id} className="flex items-center justify-between text-xs">
									<div className="flex items-center gap-2">
										<StatusDot status={agent.status} />
										<span className="font-medium">{agent.name}</span>
									</div>
									<span className="text-muted-foreground">{agent.role}</span>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Desk Grid */}
				<div className="rounded border p-3">
					<h3 className="text-xs font-semibold mb-2">Desks ({desks.length})</h3>
					{desks.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Click &quot;Init Desks&quot; to create desks
						</p>
					) : (
						<div className="grid grid-cols-4 gap-2">
							{desks.map((desk: ConvexDesk) => {
								const occupant = agents.find((a: ConvexAgent) => a._id === desk.occupiedBy);
								return (
									<div
										key={desk._id}
										className={`rounded border p-2 text-center text-xs ${
											occupant
												? "border-green-500/40 bg-green-500/5"
												: "border-dashed border-muted-foreground/20"
										}`}
									>
										{occupant ? (
											<>
												<StatusDot status={occupant.status} />
												<p className="mt-1 font-medium truncate">{occupant.name}</p>
											</>
										) : (
											<p className="text-muted-foreground">Empty</p>
										)}
										{desk.label && <p className="text-muted-foreground truncate">{desk.label}</p>}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Tasks Board Panel ─────────────────────────────────────────

const taskStatusOrder = ["backlog", "todo", "in_progress", "review", "done", "failed"] as const;

type TaskStatus = (typeof taskStatusOrder)[number];

const taskStatusLabels: Record<TaskStatus, string> = {
	backlog: "Backlog",
	todo: "To Do",
	in_progress: "In Progress",
	review: "Review",
	done: "Done",
	failed: "Failed",
};

const taskStatusColors: Record<TaskStatus, string> = {
	backlog: "text-gray-400",
	todo: "text-blue-400",
	in_progress: "text-yellow-400",
	review: "text-purple-400",
	done: "text-green-400",
	failed: "text-red-400",
};

function TasksBoard() {
	const kanban = useQuery(api.tasks.queries.getKanban);
	const createTask = useMutation(api.tasks.mutations.create);
	const updateStatus = useMutation(api.tasks.mutations.updateStatus);

	const [newTitle, setNewTitle] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!newTitle.trim()) return;

		setIsCreating(true);
		try {
			await createTask({
				title: newTitle.trim(),
				description: newDesc.trim() || undefined,
				createdBy: "user",
			});
			setNewTitle("");
			setNewDesc("");
		} catch (error) {
			console.error("Failed to create task:", error);
		} finally {
			setIsCreating(false);
		}
	};

	const cycleStatus = async (taskId: string, currentStatus: TaskStatus) => {
		const currentIdx = taskStatusOrder.indexOf(currentStatus);
		const nextStatus = taskStatusOrder[(currentIdx + 1) % taskStatusOrder.length];
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await updateStatus({ taskId: taskId as any, status: nextStatus });
		} catch (error) {
			console.error("Failed to update task status:", error);
		}
	};

	return (
		<Card className="h-full">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2">
					<Plus className="h-4 w-4" />
					Tasks
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col h-[calc(100%-3.5rem)] p-0">
				{/* Create Task Form */}
				<form onSubmit={handleCreate} className="p-3 border-b space-y-2">
					<Input
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder="Task title..."
						className="text-xs"
						disabled={isCreating}
					/>
					<Input
						value={newDesc}
						onChange={(e) => setNewDesc(e.target.value)}
						placeholder="Description (optional)..."
						className="text-xs"
						disabled={isCreating}
					/>
					<Button
						type="submit"
						size="sm"
						disabled={isCreating || !newTitle.trim()}
						className="w-full h-7 text-xs"
					>
						{isCreating ? (
							<Loader className="h-3 w-3 animate-spin mr-1" />
						) : (
							<Plus className="h-3 w-3 mr-1" />
						)}
						Create Task
					</Button>
				</form>

				{/* Kanban Columns */}
				<div className="flex-1 overflow-y-auto p-3 space-y-3">
					{kanban ? (
						taskStatusOrder.map((status) => {
							const tasks = kanban[status] ?? [];
							if (tasks.length === 0 && status !== "backlog" && status !== "todo") return null;
							return (
								<div key={status}>
									<h4 className={`text-xs font-semibold mb-1 ${taskStatusColors[status]}`}>
										{taskStatusLabels[status]} ({tasks.length})
									</h4>
									{tasks.length === 0 ? (
										<p className="text-xs text-muted-foreground pl-2">—</p>
									) : (
										<div className="space-y-1">
											{tasks.map((task: ConvexTask) => (
												<button
													type="button"
													key={task._id}
													onClick={() => cycleStatus(task._id as string, status)}
													className="w-full text-left rounded border p-2 text-xs hover:bg-secondary/20 transition-colors cursor-pointer"
												>
													<p className="font-medium">{task.title}</p>
													{task.description && (
														<p className="text-muted-foreground truncate">{task.description}</p>
													)}
													{task.assignedTo && (
														<p className="text-muted-foreground mt-1">
															Assigned: {String(task.assignedTo).slice(-6)}
														</p>
													)}
												</button>
											))}
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className="flex items-center justify-center h-full">
							<Loader className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Main Dashboard ────────────────────────────────────────────

function TestDashboard() {
	return (
		<div className="grid grid-cols-3 gap-4 p-4 h-full overflow-hidden">
			<ManagerChat />
			<OfficeState />
			<TasksBoard />
		</div>
	);
}
