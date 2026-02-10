import express from "express";
import cors from "cors";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import equiposRoutes from "./routes/equipos.routes.js"

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, message: "API Gestor Hospitalario funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/equipos", equiposRoutes);

export default app;
