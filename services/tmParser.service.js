export function parseFinalInfo(finalInfo) {
  try {
    if (!finalInfo || finalInfo === "[]") return [];
    return JSON.parse(finalInfo);
  } catch (err) {
    console.error("FinalInfo parse error:", err);
    return [];
  }
}
function normalizeFoId(foId) {
  if (!foId) return foId;

  // remove leading zeros only
  return foId.replace(/^0+/, "");
}

export function sapTimestampToDate(s) {
  console.log("ts received from SAP:", s);
    if (!s || s === "0") return null;     
  const ts = String(s).trim();
   return new Date(
     `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T` +
     `${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`
   );
}

// export function sapTimestampUtcToIstDate(s) {
//   const d = sapTimestampToDate(s);
//   if (!d) return null;

//   // Add 5 hours 30 minutes to convert UTC timestamp to IST
//   return new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
// }


export function sapTimestampUtcToDate(s) {
  if (!s || s === "0") return null;

  const ts = String(s).trim();
  if (!/^\d{14}$/.test(ts)) return null;

  const yyyy = Number(ts.slice(0, 4));
  const mm = Number(ts.slice(4, 6)) - 1;
  const dd = Number(ts.slice(6, 8));
  const hh = Number(ts.slice(8, 10));
  const mi = Number(ts.slice(10, 12));
  const ss = Number(ts.slice(12, 14));

  return new Date(Date.UTC(yyyy, mm, dd, hh, mi, ss));
}





export function parseSapEvent(ev) {
  return {
    FoId: normalizeFoId(ev.FoId),
    StopId: ev.StopId,
    Event: ev.Event,
    Action: ev.Action,
    EventCode: ev.EventCode,
    EvtReasonCode: ev.EvtReasonCode,
    Description: ev.Description,
    ETA: sapTimestampToDate(ev.ETA),
    Discrepency: ev.Discrepency ?? null,
    Items: ev.Items ? JSON.stringify(ev.Items) : null,
    ActualReportedTime: sapTimestampUtcToDate(ev.Timestamp),
    PlannedTime: sapTimestampToDate(ev.PlanTimestamp),
    Latitude: ev.Latitude ? Number(ev.Latitude) : null,
    Longitude: ev.Longitude ? Number(ev.Longitude) : null,
    Location: ev.Location
  };
}
