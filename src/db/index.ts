import "dotenv/config";
import * as schema from "./schema";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Configure connection pool with explicit settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
});

export const db = drizzle(pool, { schema });
