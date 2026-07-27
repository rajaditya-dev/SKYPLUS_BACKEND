import express from "express";
import { searchSkyPlusFo, updateSkyForFo } from "../controllers/sky.controller.js";
import {
  receiveEvent,
  receiveDelay,
  receivePOD,
  recieveUnloading
} from "../controllers/sky.controller.js";

const router = express.Router();

router.post("/event", receiveEvent);
router.post("/delay", receiveDelay);
router.post("/pod", receivePOD);
router.post("/unloading",recieveUnloading);
router.get("/sky/freight-order/:foId", searchSkyPlusFo);
router.post("/sky/update/:foId", updateSkyForFo);
export default router;
