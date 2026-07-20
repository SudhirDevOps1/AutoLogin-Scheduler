// ─── Schema Barrel (Runtime Multi-DB Selection) ─────────────────────────
// Exports the correct schema based on DATABASE_URL at runtime:
//   libsql://  → Turso/libSQL (SQLite)
//   postgresql:// → PostgreSQL
//   empty → Cloudflare D1
//
// TypeScript sees PG types everywhere. At runtime, the matching schema
// objects are used with the matching Drizzle driver. Both API surfaces
// (.select / .insert / .update / .delete / .onConflictDoUpdate) are
// identical across PG and SQLite Drizzle clients.

import { config } from "@/lib/config";
import * as pgSchema from "./schema-pg";
import * as tursoSchema from "./schema-turso";

const useTurso = config.DB_TYPE === "turso";
const active = useTurso ? tursoSchema : pgSchema;

export const users = active.users as typeof pgSchema.users;
export const sessions = active.sessions as typeof pgSchema.sessions;
export const credentials = active.credentials as typeof pgSchema.credentials;
export const schedules = active.schedules as typeof pgSchema.schedules;
export const loginLogs = active.loginLogs as typeof pgSchema.loginLogs;
export const auditLogs = active.auditLogs as typeof pgSchema.auditLogs;
export const rateLimits = active.rateLimits as typeof pgSchema.rateLimits;

export type User = pgSchema.User;
export type NewUser = pgSchema.NewUser;
export type Session = pgSchema.Session;
export type Credential = pgSchema.Credential;
export type NewCredential = pgSchema.NewCredential;
export type Schedule = pgSchema.Schedule;
export type NewSchedule = pgSchema.NewSchedule;
export type LoginLog = pgSchema.LoginLog;
export type AuditLog = pgSchema.AuditLog;
export type RateLimit = pgSchema.RateLimit;
