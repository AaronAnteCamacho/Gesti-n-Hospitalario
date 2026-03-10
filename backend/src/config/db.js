import sql from "mssql";

let pool = null;

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
      encrypt: String(process.env.DB_ENCRYPT || "true").toLowerCase() === "true",
      trustServerCertificate:
        String(process.env.DB_TRUST_SERVER_CERT || "false").toLowerCase() === "true",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 30000,
    connectionTimeout: 30000,
  };

  console.log("DB cfg:", {
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    encrypt: config.options.encrypt,
    trustServerCertificate: config.options.trustServerCertificate,
  });

  try {
    pool = await sql.connect(config);
    return pool;
  } catch (err) {
    pool = null;
    console.error("Error conectando a SQL Server:", err);
    throw err;
  }
}