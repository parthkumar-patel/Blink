import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily event sync at 6 AM UTC (10 PM PST / 11 PM PDT)
crons.daily(
  "daily event sync",
  { hourUTC: 6, minuteUTC: 0 },
  internal.aggregation.dailyEventSync
);

// Clean up old events weekly (Sunday at 2 AM UTC)
crons.weekly(
  "cleanup old events",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.aggregation.cleanupOldEvents
);

export default crons;