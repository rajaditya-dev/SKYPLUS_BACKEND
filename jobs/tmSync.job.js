import cron from "node-cron";
import { syncTMToAzure } from "../services/tmToAzure.service.js";

const syncEnabled = process.env.TM_SYNC_ENABLED === "true";

if (syncEnabled) {
  // Run every 2 minutes only when explicitly enabled.
  cron.schedule("*/2 * * * *", async () => {
    try {
      console.log("⏳ TM Sync started");
      const result = await syncTMToAzure();
      console.log("✅ TM Sync completed:", result.count);
    } catch (err) {
      console.error("❌ TM Sync failed:", {
        message: err.message,
        status: err.response?.status,
      });
    }
  });
} else {
  console.log("TM sync is disabled. Set TM_SYNC_ENABLED=true after SAP credentials are validated.");
}
