//backend/index.js  
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
//import tmSyncRoutes from "./routes/tmSync.routes.js";
import "./jobs/tmSync.job.js";
import skyRoutes from "./routes/sky.routes.js";
import eventsRoutes from "./routes/Events.js";
// 🔹 Import route files (one per table)
import shipmentEventsRoutes from "./routes/shipmentEvents.js";
import trackingHeaderRoutes from "./routes/ShipmentEventsHeader.js";
import uiFieldConfigRoutes from "./routes/ui-fields-config.js";
//import eventsRoutes from "./routes/eventsRoutes.js";
import Events from "./routes/Events.js";
import tmSyncRoutes from "./routes/tmSync.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";


const app = express();
const PORT = process.env.PORT || 8080;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: [
    "https://gentle-glacier-0aa062d03.4.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:4004",
    "http://localhost:3000",
    "http://localhost:5001"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());    // ✅ REQUIRED


/* -------------------- API ROUTES -------------------- */
app.get("/",(req,res)=>{
  res.send("API is working");
})
app.use("/api/", shipmentEventsRoutes);
app.use("/api/", trackingHeaderRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/", uiFieldConfigRoutes);
app.use("/api/", Events);
// 🔹 NEW ROUTES REGISTERED
app.use("/api/", tmSyncRoutes);
app.use("/api", skyRoutes);
// Tracking routes from sky app
app.use("/api", trackingRoutes);

/* -------------------- HEALTH CHECK -------------------- */
app.get("/api/health", (_req, res) => {
  res.json({ status: "Backend is running 🚀" });
});

/* -------------------- START SERVER -------------------- */
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start backend:", err);
    process.exit(1);
  }
})();
