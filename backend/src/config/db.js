import sql from "mssql";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // ejemplo: localhost
  database: process.env.DB_NAME, // inventario_hospital
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;
export async function getPool() {
  if (pool) return pool;
  pool = await sql.connect(config);
  return pool;
}

export { sql };
