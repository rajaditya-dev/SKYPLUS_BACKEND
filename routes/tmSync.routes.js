import express from "express";
import { getSapHealth } from "../controllers/tmSync.controller.js";

const router = express.Router();

router.get("/health/sap", getSapHealth);

export default router;
