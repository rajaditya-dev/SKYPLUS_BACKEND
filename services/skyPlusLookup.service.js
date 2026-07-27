import sql from "mssql";
import { getPool } from "../config/db.js";
import { sapRequest } from "./sapClient.service.js";

function normalizeFoId(value) {
  const foId = String(value ?? "").trim();
  if (!/^\d{1,22}$/.test(foId)) {
    const error = new Error("Container number must contain digits only");
    error.statusCode = 400;
    throw error;
  }

  return foId.replace(/^0+(?=\d)/, "");
}

function toDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSapDate(value) {
  if (!value || value === "0") return null;

  const text = String(value).trim();
  const odataDate = /^\/Date\((\d+)(?:[+-]\d+)?\)\/$/.exec(text);
  if (odataDate) {
    return new Date(Number(odataDate[1]));
  }

  if (!/^\d{14}$/.test(text)) return null;
  return new Date(
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)) - 1,
    Number(text.slice(6, 8)),
    Number(text.slice(8, 10)),
    Number(text.slice(10, 12)),
    Number(text.slice(12, 14)),
  );
}

export async function fetchAndCacheSkyPlusFo(inputFoId) {
  const foId = normalizeFoId(inputFoId);
  let response;

  try {
    response = await sapRequest({
      method: "GET",
      url: `/SkyPlusFieldsSet('${foId}')`,
      params: { "$format": "json" },
    });
  } catch (error) {
    if (error.response?.status === 404) {
      const notFound = new Error(`Container number ${foId} was not found in TM`);
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }

  const sky = response.data?.d ?? response.data;
  if (!sky || typeof sky !== "object") {
    const error = new Error(`Container number ${foId} returned no data from TM`);
    error.statusCode = 404;
    throw error;
  }

  const status = String(sky.ExecutionStatus || "Planned").trim() || "Planned";
  const pool = await getPool();
  const result = await pool.request()
    .input("FoId", sql.NVarChar(50), foId)
    .input("Status", sql.NVarChar(50), status)
    .input("CargoQuantity", sql.Decimal(18, 3), toDecimal(sky.CargoQuantity))
    .input("CargoVolume", sql.Decimal(18, 3), toDecimal(sky.CargoVolume))
    .input("CargoWeight", sql.Decimal(18, 3), toDecimal(sky.CargoWeight))
    .input("QuantityUom", sql.NVarChar(10), sky.QuantityUom || null)
    .input("VolumeUom", sql.NVarChar(10), sky.VolumeUom || null)
    .input("WeightUom", sql.NVarChar(10), sky.WeightUom || null)
    .input("DepartureCountry", sql.NVarChar(5), sky.DepartureCountry || null)
    .input("ExecutionStatus", sql.NVarChar(30), sky.ExecutionStatus || null)
    .input("PlannedArrivalAt", sql.DateTime, toSapDate(sky.PlannedArrivalAt))
    .input("PlannedArrivalId", sql.NVarChar(50), sky.PlannedArrivalId || null)
    .input("PlannedDepartureAt", sql.DateTime, toSapDate(sky.PlannedDepartureAt))
    .input("PlannedDepartureId", sql.NVarChar(50), sky.PlannedDepartureId || null)
    .input("PlannedTotalDistance", sql.Decimal(18, 3), toDecimal(sky.PlannedTotalDistance))
    .input("PlannedTotalUom", sql.NVarChar(10), sky.PlannedTotalUom || null)
    .query(`
      MERGE dbo.FreightOrderDetails WITH (HOLDLOCK) AS target
      USING (SELECT @FoId AS FoId) AS source
        ON target.FoId = source.FoId
      WHEN MATCHED THEN
        UPDATE SET
          CargoQuantity = @CargoQuantity,
          CargoVolume = @CargoVolume,
          CargoWeight = @CargoWeight,
          QuantityUom = @QuantityUom,
          VolumeUom = @VolumeUom,
          WeightUom = @WeightUom,
          DepartureCountry = @DepartureCountry,
          ExecutionStatus = @ExecutionStatus,
          PlannedArrivalAt = @PlannedArrivalAt,
          PlannedArrivalId = @PlannedArrivalId,
          PlannedDepartureAt = @PlannedDepartureAt,
          PlannedDepartureId = @PlannedDepartureId,
          PlannedTotalDistance = @PlannedTotalDistance,
          PlannedTotalUom = @PlannedTotalUom,
          LastUpdated = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (
          FoId, Status, CargoQuantity, CargoVolume, CargoWeight,
          QuantityUom, VolumeUom, WeightUom, DepartureCountry,
          ExecutionStatus, PlannedArrivalAt, PlannedArrivalId,
          PlannedDepartureAt, PlannedDepartureId,
          PlannedTotalDistance, PlannedTotalUom, LastUpdated
        )
        VALUES (
          @FoId, @Status, @CargoQuantity, @CargoVolume, @CargoWeight,
          @QuantityUom, @VolumeUom, @WeightUom, @DepartureCountry,
          @ExecutionStatus, @PlannedArrivalAt, @PlannedArrivalId,
          @PlannedDepartureAt, @PlannedDepartureId,
          @PlannedTotalDistance, @PlannedTotalUom, GETDATE()
        )
      OUTPUT INSERTED.*;
    `);

  return result.recordset[0];
}
