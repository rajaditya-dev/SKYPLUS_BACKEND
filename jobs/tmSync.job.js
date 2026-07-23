import cron from "node-cron";
import { syncTMToAzure } from "../services/tmToAzure.service.js";
import { summarizeSapError } from "../services/sapClient.service.js";

const syncEnabled = process.env.TM_SYNC_ENABLED === "true";
let syncRunning = false;

async function runScheduledSync() {
  if (syncRunning) {
    console.warn("TM sync skipped because the previous run is still active.");
    return;
  }

  syncRunning = true;
  try {
    console.log("TM sync started", { pid: process.pid });
    const result = await syncTMToAzure();
    console.log("TM sync completed", { count: result.count, pid: process.pid });
  } catch (error) {
    console.error("TM sync failed", {
      ...summarizeSapError(error),
      pid: process.pid,
    });
  } finally {
    syncRunning = false;
  }
}

if (syncEnabled) {
  cron.schedule("*/2 * * * *", runScheduledSync);
  console.log("TM sync scheduler enabled", { pid: process.pid });
} else {
  console.log("TM sync scheduler disabled", { pid: process.pid });
}
