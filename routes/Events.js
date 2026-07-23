// backend/routes/Events.js
import express from "express";
import sql from "mssql";
import { getPool } from "../config/db.js";
import { syncAndGetEventsByFoId } from "../services/events.service.js";

const router = express.Router();

function eventId(row, foId, index) {
  return String(
    row.id ??
      row.ID ??
      `${foId}|${row.StopId ?? ""}|${row.ActualReportedTime ?? row.PlannedTime ?? index}`
  );
}

// Database-first endpoint used by the shipment details page. It remains
// available even when SAP TM is temporarily unreachable.
router.get("/", async (req, res) => {
  const foId = String(req.query.foId ?? "").trim();
  if (!foId) {
    return res.status(400).json({ error: "foId is required" });
  }

  try {
    const pool = getPool();
    const result = await pool
      .request()
      .input("FoId", sql.NVarChar, foId)
      .query(`
        SELECT *
        FROM dbo.Events
        WHERE FoId = @FoId
        ORDER BY COALESCE(ActualReportedTime, PlannedTime)
      `);

    return res.json(
      result.recordset.map((row, index) => ({
        id: eventId(row, foId, index),
        ...row,
      }))
    );
  } catch (err) {
    console.error("Events API error:", err.message);
    return res.status(500).json({ error: "Failed to fetch cached events" });
  }
});

// Live synchronization is explicit so a SAP authentication outage cannot
// break normal reads of shipment details.
router.post("/sync", async (req, res) => {
  const foId = String(req.body?.foId ?? req.query.foId ?? "").trim();
  if (!foId) {
    return res.status(400).json({ error: "foId is required" });
  }

  try {
    const events = await syncAndGetEventsByFoId(foId);
    return res.json({ success: true, events });
  } catch (err) {
    const status = err.response?.status || 502;
    console.error("Events sync failed", {
      message: err.message,
      status,
    });
    return res.status(status).json({
      success: false,
      error: status === 401 ? "SAP authentication failed" : "SAP synchronization failed",
    });
  }
});

export default router;
