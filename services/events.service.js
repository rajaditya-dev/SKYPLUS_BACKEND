import sql from "mssql";
import { getPool } from "../config/db.js";
import { fetchEventsReportingSet } from "./tm.service.js";
// import { parseSapEvent } from "./tmParser.service.js";
import { parseSapEvent, sapTimestampUtcToDate } from "./tmParser.service.js";

function etaStringToDate(eta) {
  if (!eta) return null;

  const s = String(eta).trim();   // 🔑 force string + trim

  if (!/^\d{14}$/.test(s)) {
    console.error("❌ ETA format invalid:", s);
    return null;
  }

  const yyyy = Number(s.substring(0, 4));
  const MM   = Number(s.substring(4, 6)) - 1;
  const dd   = Number(s.substring(6, 8));
  const HH   = Number(s.substring(8, 10));
  const mm   = Number(s.substring(10, 12));
  const ss   = Number(s.substring(12, 14));

  const d = new Date(Date.UTC(yyyy, MM, dd, HH, mm, ss));

  if (isNaN(d.getTime())) {
    console.error("❌ ETA date invalid:", s);
    return null;
  }

  return d;
}

export async function saveSkyEvent(data) {
  const pool = await getPool();

  const etaDate = etaStringToDate(data.ETA);

  const eventName =
    String(data.Event ?? "").trim() ||
    (data.Action === "ARRV"
      ? "Arrival at destination"
      : data.Action === "DEPT"
        ? "Departure"
        : data.Action === "POD"
          ? "Proof of delivery"
          : String(data.Action ?? "").trim() || null);

  const actualReportedTime = data.ActualReportedTime
    ? new Date(data.ActualReportedTime)
    : data.Timestamp
      ? sapTimestampUtcToDate(data.Timestamp)
      : new Date();


  const plannedTime = data.PlannedTime
    ? new Date(data.PlannedTime)
    : etaDate;

  const location = data.Location ?? data.StopId ?? null;

  console.log("ETA RAW:", data.ETA);
  console.log("ETA PARSED:", etaDate);

  await pool.request()
    .input("FoId", sql.NVarChar, data.FoId)
    .input("Latitude", sql.Decimal(18, 10), data.Latitude ?? null)
    .input("Longitude", sql.Decimal(18, 10), data.Longitude ?? null)
    .input("StopId", sql.NVarChar, data.StopId ?? null)
    .input("Event", sql.NVarChar, eventName)
    .input("Action", sql.NVarChar, data.Action ?? null)
    .input("EventCode", sql.NVarChar, data.EventCode ?? null)
    .input("EvtReasonCode", sql.NVarChar, data.EvtReasonCode ?? null)
    .input("Description", sql.NVarChar, data.Description ?? null)
    .input("ETA", sql.DateTime2, etaDate)
    .input("Discrepency", sql.NVarChar, data.Discrepency ?? null)
    .input("Items", sql.NVarChar(sql.MAX), data.Items ?? null)
    .input("Location", sql.NVarChar, location)
    .input("ActualReportedTime", sql.DateTime, actualReportedTime)
    .input("PlannedTime", sql.DateTime, plannedTime)
    .query(`
      INSERT INTO Events
      (
        FoId, StopId, Event, Action, EventCode, EvtReasonCode,
        Description, ETA, Discrepency, Items,
        Latitude, Longitude, Location, ActualReportedTime, PlannedTime
      )
      VALUES
      (
        @FoId, @StopId, @Event, @Action, @EventCode, @EvtReasonCode,
        @Description, @ETA, @Discrepency, @Items,
        @Latitude, @Longitude, @Location, @ActualReportedTime, @PlannedTime
      )
    `);
}



export async function syncAndGetEventsByFoId(foId) {
  const pool = await getPool();

  // 1️⃣ Fetch latest events from TM
  const sapEvents = await fetchEventsReportingSet(foId);
  console.log("sapEvents recieved:",sapEvents);


  // 2️⃣ Save events safely (NO DUPLICATES)
  for (const ev of sapEvents) {
    console.log("keys:", Object.keys(ev));
    console.log("Timestamp:", ev.Timestamp);
    const e = parseSapEvent(ev);
    const effectiveTime = e.ActualReportedTime ?? e.PlannedTime ?? null;

    await pool.request()
      .input("FoId", sql.NVarChar, e.FoId)
      .input("StopId", sql.NVarChar, e.StopId)
      .input("Event", sql.NVarChar, e.Event)
      .input("Action", sql.NVarChar, e.Action)
      .input("EventCode", sql.NVarChar, e.EventCode)
      .input("EvtReasonCode", sql.NVarChar, e.EvtReasonCode)
      .input("Description", sql.NVarChar, e.Description)
      .input("ETA", sql.DateTime2, e.ETA)
      .input("Discrepency", sql.NVarChar, e.Discrepency)
      .input("Items", sql.NVarChar(sql.MAX), e.Items)
      .input("ActualReportedTime", sql.DateTime, e.ActualReportedTime)
      .input("PlannedTime", sql.DateTime, e.PlannedTime)
      .input("EffectiveTime", sql.DateTime, effectiveTime)
      .input("Latitude", sql.Decimal(18, 10), e.Latitude)
      .input("Longitude", sql.Decimal(18, 10), e.Longitude)
      .input("Location", sql.NVarChar, e.Location)
      .query(`
        MERGE dbo.Events AS T
        USING (
          SELECT
            @FoId FoId,
            @StopId StopId,
            @Location Location,
            @Event Event,
            @EffectiveTime EffectiveTime
        ) AS S
        ON T.FoId = S.FoId
        AND ISNULL(T.StopId, '') = ISNULL(S.StopId, '')
        AND ISNULL(T.Location, '') = ISNULL(S.Location, '')
        AND ISNULL(T.Event, '') = ISNULL(S.Event, '')
        AND (
          ISNULL(T.ActualReportedTime, T.PlannedTime) = S.EffectiveTime
          OR (
            ISNULL(T.ActualReportedTime, T.PlannedTime) IS NULL
            AND S.EffectiveTime IS NULL
          )
        )


        WHEN NOT MATCHED THEN
          INSERT (
            FoId, StopId, Event, Action, EventCode, EvtReasonCode,
            Description, ETA, Discrepency, Items,
            CreatedAt, ActualReportedTime, PlannedTime,
            Latitude, Longitude, Location
          )
          VALUES (
            @FoId, @StopId, @Event, @Action, @EventCode, @EvtReasonCode,
            @Description, @ETA, @Discrepency, @Items,
            SYSDATETIME(), @ActualReportedTime, @PlannedTime,
            @Latitude, @Longitude, @Location
          );
      `);
  }

  // 3️⃣ Return events FROM DB (single source for UI)
  // const result = await pool.request()
  //   .input("FoId", sql.NVarChar, foId)
  //   .query(`
  //     SELECT *
  //     FROM dbo.Events
  //     WHERE FoId = @FoId
  //     ORDER BY ActualReportedTime
  //   `);

  // return result.recordset;

   // 3. Return TM events directly, not DB rows
  return sapEvents.map((ev, index) => {
    const e = parseSapEvent(ev);
    return {
      id: `${e.FoId || foId}|${e.StopId || ""}|${ev.Timestamp || ev.PlanTimestamp || index}`,
      ...e,
    };
  });

}