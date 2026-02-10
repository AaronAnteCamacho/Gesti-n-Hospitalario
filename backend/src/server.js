import dotenv from "dotenv";

// Carga SIEMPRE backend/.env (server.js está en backend/src)
dotenv.config({ path: new URL("../.env", import.meta.url) });

import app from "./app.js";

console.log("ENV:", {
  DB_SERVER: process.env.DB_SERVER,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
