//backend/services/tm.service.js
import axios from "axios";

const SAP_BASE = process.env.SAP_BASE_URL;
const SAP_CLIENT = process.env.SAP_CLIENT || "";


/* ---------------- Helper ---------------- */

function unwrapOData(data) {
  if (data?.d) return data.d;
  return data;
}

async function fetchCsrf() {
  const url =
    `${SAP_BASE}/$metadata` +
    (SAP_CLIENT ? `?sap-client=${SAP_CLIENT}` : "");

  const res = await axios.get(url, {
    headers: {
      "x-csrf-token": "Fetch",
      Authorization: `Basic ${process.env.SAP_BASIC}`,
      Accept: "application/xml",
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  return {
    token: res.headers["x-csrf-token"],
    cookie: res.headers["set-cookie"]
      ?.map(c => c.split(";")[0])
      .join("; ")
  };
}
export async function fetchEventsReportingSet(foId) {
  const url =
    `${SAP_BASE}/EventsReportingSet?$filter=FoId eq '${foId}'&$format=json`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Basic ${process.env.SAP_BASIC}`,
      Accept: "application/json"
    }
  });

  return response.data?.d?.results || [];
}
/* ================= EVENT → TM ================= */

export async function postEventToTM(payload) {
  const { FoId, Action, StopId, Latitude, Longitude, Timestamp } = payload;

  if (!FoId || !Action || !StopId ) {
    throw new Error("FoId & Action required for TM Event");
  }

  const { token, cookie } = await fetchCsrf();

  const tmPayload = {
    FoId: String(FoId).trim(),
    Action: String(Action).trim(),
    StopId: String(StopId ?? "").trim(),
    Latitude:Latitude,
    Longitude:Longitude,
    Timestamp: Timestamp
  };

  const url =
    `${SAP_BASE}/EventsReportingSet` +
    (SAP_CLIENT ? `?sap-client=${SAP_CLIENT}` : "");

  const result = await axios.post(url, tmPayload, {
    
    headers: {
      Authorization: `Basic ${process.env.SAP_BASIC}`,
      "x-csrf-token": token,
      Cookie: cookie,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    },
    validateStatus: () => true
  });

   console.log("TM POST REQUEST PAYLOAD:", tmPayload);
   console.log("TM POST RAW RESPONSE:", JSON.stringify(result.data, null, 2));

  if (result.status >= 400) {
    throw new Error(
      `TM EVENT failed (${result.status}): ${JSON.stringify(result.data)}`
    );
  }

  return unwrapOData(result.data);
}

export async function postDelayToTM(payload) {
  const { token, cookie } = await fetchCsrf();

  // 🔒 STRICT VALIDATION
  if (!/^\d{14}$/.test(payload.ETA)) {
    throw new Error("ETA must be YYYYMMDDHHMMSS");
  }

  const tmPayload = {
    FoId: String(payload.FoId).trim(),
    StopId: String(payload.StopId).trim(),
    ETA: payload.ETA,                 // ✅ EXACT FORMAT
    RefEvent: String(payload.RefEvent ?? "").trim(),
    EventCode: String(payload.EventCode ?? "").trim(),
    EvtReasonCode: String(payload.EvtReasonCode ?? "").trim(),
    Description: String(payload.Description ?? "").trim(),
    Latitude:String(payload.Latitude),
    Longitude:String(payload.Longitude ),
    Timestamp: payload.Timestamp
  };

  const url =
    `${SAP_BASE}/DelaySet` +
    (SAP_CLIENT ? `?sap-client=${SAP_CLIENT}` : "");

  const result = await axios.post(url, tmPayload, {
    headers: {
      Authorization: `Basic ${process.env.SAP_BASIC}`,
      "x-csrf-token": token,
      Cookie: cookie,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    },
    validateStatus: () => true
  });

  if (result.status >= 400) {
    throw new Error(`TM Delay failed: ${JSON.stringify(result.data)}`);
  }

  return tmPayload; // return for SQL save
}


export async function postPODToTM(payload) {
  const { FoId, StopId, Discrepency, Items ,Latitude, Longitude, Timestamp } = payload;

  if (!FoId || !StopId) {
    throw new Error("FoId & StopId required for POD");
  }

  const { token, cookie } = await fetchCsrf();

  const tmPayload = {
    FoId: String(FoId).trim(),
    StopId: String(StopId).trim(),
    Discrepency: String(Discrepency ?? "").trim(),
    Items: String(Items ?? "").trim(),
    Latitude:String(Latitude),
    Longitude:String(Longitude),
    Timestamp: Timestamp
  };

  console.log("FINAL POD PAYLOAD >>>", tmPayload); // debug once

  const result = await axios.post(
    `${SAP_BASE}/ProofOfDeliverySet${SAP_CLIENT ? `?sap-client=${SAP_CLIENT}` : ""}`,
    tmPayload,
    {
      headers: {
        Authorization: `Basic ${process.env.SAP_BASIC}`,
        "x-csrf-token": token,
        Cookie: cookie,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      validateStatus: () => true
    }
  );

  if (result.status >= 400) {
    throw new Error(`TM POD failed: ${JSON.stringify(result.data)}`);
  }

  return result.data;
}

export async function postUnloadingToTM(payload) {
  const { FoId, StopId, Latitude, Longitude, Timestamp } = payload;

  if (!FoId || !StopId) {
    throw new Error("FoId & StopId required for Unloading");
  }

  const { token, cookie } = await fetchCsrf();

  const tmPayload = {
    FoId: String(FoId).trim(),
    StopId: String(StopId).trim(),
    Latitude:String(Latitude),
    Longitude:String(Longitude),
    Timestamp: Timestamp
  };

  console.log("FINAL UNLOADING PAYLOAD >>>", tmPayload); // debug once

  const result = await axios.post(
    `${SAP_BASE}/UnloadingSet${SAP_CLIENT ? `?sap-client=${SAP_CLIENT}` : ""}`,
    tmPayload,
    {
      headers: {
        Authorization: `Basic ${process.env.SAP_BASIC}`,
        "x-csrf-token": token,
        Cookie: cookie,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      validateStatus: () => true
    }
  );

  

  if (result.status >= 400) {
    throw new Error(`TM UNLOADING failed: ${JSON.stringify(result.data)}`);
  }

  return result.data;
}






