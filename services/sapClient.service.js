import axios from "axios";

const SAP_BASE_URL = String(process.env.SAP_BASE_URL || "").trim().replace(/\/+$/, "");
const SAP_CLIENT = String(process.env.SAP_CLIENT || "").trim();
const SAP_BASIC = String(process.env.SAP_BASIC || "")
  .trim()
  .replace(/^Basic\s+/i, "");

export function getSapConfigurationStatus() {
  let basicTokenValid = false;
  try {
    const decoded = Buffer.from(SAP_BASIC, "base64").toString("utf8");
    basicTokenValid = decoded.includes(":");
  } catch {
    basicTokenValid = false;
  }

  return {
    baseUrlConfigured: Boolean(SAP_BASE_URL),
    clientConfigured: Boolean(SAP_CLIENT),
    credentialsConfigured: Boolean(SAP_BASIC),
    basicTokenValid,
  };
}

function assertSapConfiguration() {
  const status = getSapConfigurationStatus();
  const missing = Object.entries(status)
    .filter(([, valid]) => !valid)
    .map(([name]) => name);

  if (missing.length) {
    const error = new Error(`Invalid SAP configuration: ${missing.join(", ")}`);
    error.code = "SAP_CONFIG_INVALID";
    throw error;
  }
}

export async function sapRequest(config) {
  assertSapConfiguration();

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const method = String(config.method || "GET").toUpperCase();
  const path = String(config.url || "");

  console.log("SAP request started", {
    requestId,
    method,
    path,
    client: SAP_CLIENT,
  });

  try {
    const response = await axios.request({
      baseURL: SAP_BASE_URL,
      timeout: 15000,
      ...config,
      params: {
        ...(config.params || {}),
        ...(SAP_CLIENT ? { "sap-client": SAP_CLIENT } : {}),
      },
      headers: {
        Authorization: `Basic ${SAP_BASIC}`,
        Accept: "application/json",
        ...(SAP_CLIENT ? { "sap-client": SAP_CLIENT } : {}),
        ...(config.headers || {}),
      },
    });

    console.log("SAP request completed", {
      requestId,
      method,
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    console.error("SAP request failed", {
      requestId,
      method,
      path,
      status: error.response?.status ?? null,
      code: error.code ?? null,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

export function summarizeSapError(error) {
  return {
    message: error.message,
    status: error.response?.status ?? null,
    code: error.code ?? null,
  };
}
