import express from "express";
import sql from "mssql";
import { getPool } from "../config/db.js";

const router = express.Router();

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalize(p) {
  return {
    FoId: String(p.FoId || "").trim(),
    DriverId: String(p.DriverId || "DRIVER_001"),
    Latitude: toNum(p.Latitude),
    Longitude: toNum(p.Longitude),
    Accuracy: p.Accuracy == null ? null : toNum(p.Accuracy),
    Timestamp: toNum(p.Timestamp),
    Speed: p.Speed == null ? null : toNum(p.Speed),
    Bearing: p.Bearing == null ? null : toNum(p.Bearing),
  };
}

router.post("/tracking/location", async (req, res) => {
  try {
    const p = normalize(req.body || {});

    if (!p.FoId || p.Latitude == null || p.Longitude == null || p.Timestamp == null) {
      return res.status(400).json({
        error: "FoId, Latitude, Longitude, Timestamp required",
      });
    }

    const pool = getPool();

    await pool
      .request()
      .input("Fold", sql.NVarChar(100), p.FoId)
      .input("DriverId", sql.NVarChar(100), p.DriverId)
      .input("Latitude", sql.Float, p.Latitude)
      .input("Longitude", sql.Float, p.Longitude)
      .input("Accuracy", sql.Float, p.Accuracy)
      .input("Timestamp", sql.BigInt, p.Timestamp)
      .input("Speed", sql.Float, p.Speed)
      .input("Bearing", sql.Float, p.Bearing)
      .query(`
        INSERT INTO dbo.TrackingLocations
          (Fold, DriverId, Latitude, Longitude, Accuracy, Timestamp, Speed, Bearing)
        VALUES
          (@Fold, @DriverId, @Latitude, @Longitude, @Accuracy, @Timestamp, @Speed, @Bearing)
      `);

    return res.status(204).end();
  } catch (e) {
    console.error("SKY+ receiver error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get("/tracking/latest", async (req, res) => {
  try {
    const Fold = String(req.query.FoId || req.query.Fold || "").trim();
    if (!Fold) return res.status(400).json({ error: "FoId required" });

    const pool = getPool();

    const result = await pool
      .request()
      .input("Fold", sql.NVarChar(100), Fold)
      .query(`
        SELECT TOP 1
          Fold,
          DriverId,
          Latitude,
          Longitude,
          Accuracy,
          Timestamp,
          Speed,
          Bearing
        FROM dbo.TrackingLocations
        WHERE Fold = @Fold
        ORDER BY Timestamp DESC, ID DESC
      `);

    const row = result.recordset[0];
    if (!row) return res.json({});

    return res.json({
      FoId: row.Fold,
      DriverId: row.DriverId,
      Latitude: row.Latitude,
      Longitude: row.Longitude,
      Accuracy: row.Accuracy,
      Timestamp: Number(row.Timestamp),
      Speed: row.Speed,
      Bearing: row.Bearing,
    });
  } catch (e) {
    console.error("SKY+ latest error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get("/tracking/history", async (req, res) => {
  try {
    const Fold = String(req.query.FoId || req.query.Fold || "").trim();
    if (!Fold) return res.status(400).json({ error: "FoId required" });

    const limit = Math.max(1, Math.min(2000, Number(req.query.limit) || 300));
    const pool = getPool();

    const result = await pool
      .request()
      .input("Fold", sql.NVarChar(100), Fold)
      .input("Limit", sql.Int, limit)
      .query(`
        SELECT TOP (@Limit)
          Fold,
          DriverId,
          Latitude,
          Longitude,
          Accuracy,
          Timestamp,
          Speed,
          Bearing
        FROM dbo.TrackingLocations
        WHERE Fold = @Fold
        ORDER BY Timestamp DESC, ID DESC
      `);

    const rows = result.recordset.reverse().map((row) => ({
      FoId: row.Fold,
      DriverId: row.DriverId,
      Latitude: row.Latitude,
      Longitude: row.Longitude,
      Accuracy: row.Accuracy,
      Timestamp: Number(row.Timestamp),
      Speed: row.Speed,
      Bearing: row.Bearing,
    }));

    return res.json(rows);
  } catch (e) {
    console.error("SKY+ history error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

export default router;
