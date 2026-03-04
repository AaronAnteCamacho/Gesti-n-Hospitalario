import express from "express";
import cors from "cors";

import { getPool } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import equiposRoutes from "./routes/equipos.routes.js";
import bitacorasRoutes from "./routes/bitacoras.routes.js";
import areasRoutes from "./routes/areas.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import papeleraRoutes from "./routes/papelera.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, message: "API Gestor Hospitalario funcionando" });
});

// Health check DB
app.get("/api/db-ping", async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool
      .request()
      .query("SELECT DB_NAME() AS db, @@SERVERNAME AS server");
    res.json({ ok: true, info: r.recordset[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/bitacoras", bitacorasRoutes);
app.use("/api/areas", areasRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/papelera", papeleraRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/notificaciones", notificacionesRoutes);


export default app;

