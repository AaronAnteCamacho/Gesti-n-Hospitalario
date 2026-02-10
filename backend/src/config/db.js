// backend/src/config/db.js
import sql from "mssql";

let pool = null;

// Exportamos sql para poder usar sql.VarChar, sql.Int, etc. en las rutas
export { sql };

export async function getPool() {
  if (pool) return pool;

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 1433),
    options: {
      // Importante para evitar el error de certificado en local
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 30000,
    connectionTimeout: 30000,
  };

  // Debug (puedes borrarlo cuando ya funcione)
  console.log("DB cfg:", {
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
  });

  try {
    pool = await sql.connect(config);

    // Opcional: prueba rápida de conexión
    // await pool.request().query("SELECT 1 AS ok");

    return pool;
  } catch (err) {
    // Limpia pool si falló para reintentar bien en la siguiente llamada
    pool = null;
    console.error("Error conectando a SQL Server:", err);
    throw err;
  }
}
