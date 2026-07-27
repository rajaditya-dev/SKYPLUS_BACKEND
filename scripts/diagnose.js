import "dotenv/config";
import { connectDB } from "../config/db.js";
import {
  getSapConfigurationStatus,
  sapRequest,
  summarizeSapError,
} from "../services/sapClient.service.js";

async function checkAzureSql() {
  const startedAt = Date.now();
  let pool;
  try {
    pool = await connectDB();
    const result = await pool.request().query("SELECT 1 AS ok");
    return {
      dependency: "azure-sql",
      ok: result.recordset?.[0]?.ok === 1,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      dependency: "azure-sql",
      ok: false,
      code: error.code ?? null,
      message: error.message,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (pool) {
      await pool.close().catch(() => {});
    }
  }
}

async function checkSap() {
  const startedAt = Date.now();
  try {
    const response = await sapRequest({
      method: "GET",
      url: "/$metadata",
      headers: { Accept: "application/xml" },
    });
    return {
      dependency: "sap",
      ok: true,
      status: response.status,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const details = summarizeSapError(error);
    return {
      dependency: "sap",
      ok: false,
      status: details.status,
      code: details.code,
      durationMs: Date.now() - startedAt,
    };
  }
}

console.log("SkyPlus dependency diagnostics");
console.log("Scheduler configuration", {
  enabled: false,
  mode: "on-demand single-FO lookup",
});
console.log("SAP configuration", getSapConfigurationStatus());

const results = await Promise.all([checkAzureSql(), checkSap()]);
for (const result of results) {
  console.log(JSON.stringify(result));
}

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}
