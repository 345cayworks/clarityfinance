import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

export const sql = neon(databaseUrl);

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};
