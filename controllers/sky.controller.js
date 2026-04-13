//backend/controllers/sky.controller.js
import { postDelayToTM, postPODToTM,postUnloadingToTM } from "../services/tm.service.js";
import { postEventToTM } from "../services/tm.service.js";
import { updateSkyByFoId } from "../services/tmToAzure.service.js";
export async function receiveEvent(req, res) {
  try {
    const { FoId, Action,StopId,Longitude,Latitude } = req.body;
    if (!FoId || !Action || !StopId) {
      return res.status(400).json({ error: "FoId & Action & StopId required" });
    }

    const tmRes = await postEventToTM(req.body);
  //   const tmRes = await postEventToTM({
  //    FoId,
  //    Action,
  //    StopId
  // });

    res.json(tmRes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/*export async function receiveDelay(req, res) {
  try {
    const { FoId, StopId } = req.body;
    if (!FoId || !StopId) {
      return res.status(400).json({ error: "FoId & StopId required" });
    }

    await saveSkyEvent(req.body);
    const tmRes = await postDelayToTM(req.body);
    res.json(tmRes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}*/

export async function receiveDelay(req, res) {
  try {
    const payload = req.body;

    // 1️⃣ Send to TM
    const { etaDate } = await postDelayToTM(payload);

    res.json(payload);

  } catch (err) {
    console.error("Delay error:", err.message);
    res.status(400).json({ error: err.message });
  }
}


export async function receivePOD(req, res) {
  try {
    const { FoId, StopId } = req.body;
    if (!FoId || !StopId) {
      return res.status(400).json({ error: "FoId & StopId required" });
    }

    const tmRes = await postPODToTM(req.body);
    res.json(tmRes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function recieveUnloading(req, res) {
  try {
    const { FoId, StopId, Latitude, Longitude } = req.body;
    if (!FoId || !StopId) {
      return res.status(400).json({ error: "FoId & StopId required" });
    }

    const tmRes = await postUnloadingToTM(req.body);
    res.json(tmRes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSkyForFo(req, res) {
  try {
    const { foId } = req.params;

    if (!foId) {
      return res.status(400).json({ message: "FoId is required" });
    }

    const result = await updateSkyByFoId(foId);

    return res.json({
      success: true,
      foId,
      updated: result.updated
    });
  } catch (err) {
    console.error("Sky update failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
