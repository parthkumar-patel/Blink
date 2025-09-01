import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily event sync at 6 AM UTC (10 PM PST / 11 PM PDT)
crons.daily(
  "daily event sync",
  { hourUTC: 6, minuteUTC: 0 },
  internal.aggregationActions.dailyEventSync
);

// Clean up old events weekly (Sunday at 2 AM UTC)
crons.weekly(
  "cleanup old events",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.aggregation.cleanupOldEvents
);

// Update club data weekly (Saturday at 4 AM UTC)
// TODO: Uncomment after clubs functions are deployed
// crons.weekly(
//   "update club data",
//   { dayOfWeek: "saturday", hourUTC: 4, minuteUTC: 0 },
//   internal.clubs.scrapeAllClubs
// );

export default crons;
