
// import 'dotenv/config';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import * as schema from './schema';
// export const db = drizzle(process.env.DATABASE_URL!, { schema });
//export const db = drizzle(process.env.DATABASE_URL!);
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "./schema";
//const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//export const db = drizzle({ client: pool,schema: schema })
export const db = drizzle(process.env.DATABASE_URL!, { schema });