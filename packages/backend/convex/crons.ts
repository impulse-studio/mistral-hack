import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep stale agents every 5 minutes — safety net for agents that slip through
// the normal idle timeout (e.g. failed agents, race conditions, missed scheduler)
crons.interval("sweep stale agents", { minutes: 5 }, internal.office.cleanup.sweepStaleAgents);

export default crons;
