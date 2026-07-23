import express from "express";
import { getSapHealth, runTMSync } from "../controllers/tmSync.controller.js";

const router = express.Router();

router.get("/health/sap", getSapHealth);
router.post("/sync/tm", runTMSync);

export default router;
