import {
  getSapConfigurationStatus,
  sapRequest,
  summarizeSapError,
} from "../services/sapClient.service.js";

export async function getSapHealth(_req, res) {
  const configuration = getSapConfigurationStatus();

  try {
    const response = await sapRequest({
      method: "GET",
      url: "/$metadata",
      headers: { Accept: "application/xml" },
    });

    return res.json({
      ok: true,
      sapStatus: response.status,
      configuration,
    });
  } catch (error) {
    const details = summarizeSapError(error);
    return res.status(503).json({
      ok: false,
      sapStatus: details.status,
      error:
        details.status === 401
          ? "SAP rejected the configured credentials"
          : details.message,
      configuration,
    });
  }
}
