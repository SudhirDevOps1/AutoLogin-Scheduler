/**
 * ─── SQLite Schema (Turso libSQL + Cloudflare D1) ──────────────────────
 * Identical structure to schema.ts but uses `drizzle-orm/sqlite-core`.
 * Used for:
 *   - Turso (libSQL over HTTP/WebSocket)
 *   - Cloudflare D1 (via Worker binding)
 *
 * Note: SQLite uses INTEGER for booleans (0/1) and has no native bigint,
 * so we use `integer` with `{ mode: "number" }` for timestamps.
 */

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    lockedUntil: integer("locked_until"),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
  auditLogs: many(auditLogs),
  sessions: many(sessions),
}));

// ─── Sessions ─────────────────────────────────────────────────────────────
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    revoked: integer("revoked", { mode: "boolean" }).default(false).notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  })
);

// ─── Credentials ──────────────────────────────────────────────────────────
export const credentials = sqliteTable(
  "credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    siteUrl: text("site_url").notNull(),
    username: text("username").notNull(),
    encryptedPassword: text("encrypted_password").notNull(),
    loginSelector: text("login_selector"),
    passwordSelector: text("password_selector"),
    submitSelector: text("submit_selector"),
    successIndicator: text("success_indicator"),
    lastLogin: integer("last_login"),
    status: text("status").default("active").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("credentials_user_idx").on(t.userId),
  })
);

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
  schedules: many(schedules),
  logs: many(loginLogs),
}));

// ─── Schedules ────────────────────────────────────────────────────────────
export const schedules = sqliteTable(
  "schedules",
  {
    id: text("id").primaryKey(),
    credentialId: text("credential_id")
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    cronExpr: text("cron_expr").notNull(),
    executionMode: text("execution_mode").default("auto").notNull(),
    nextRun: integer("next_run").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
    alertOnFailure: integer("alert_on_failure", { mode: "boolean" }).default(true).notNull(),
    alertOnSuccess: integer("alert_on_success", { mode: "boolean" }).default(false).notNull(),
    takeScreenshot: integer("take_screenshot", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    credIdx: index("schedules_cred_idx").on(t.credentialId),
    nextRunIdx: index("schedules_next_run_idx").on(t.nextRun),
  })
);

export const schedulesRelations = relations(schedules, ({ one }) => ({
  credential: one(credentials, {
    fields: [schedules.credentialId],
    references: [credentials.id],
  }),
}));

// ─── Login Logs ───────────────────────────────────────────────────────────
export const loginLogs = sqliteTable(
  "login_logs",
  {
    id: text("id").primaryKey(),
    credentialId: text("credential_id")
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    runTime: integer("run_time").notNull(),
    durationMs: integer("duration_ms"),
    success: integer("success", { mode: "boolean" }).notNull(),
    screenshotKey: text("screenshot_key"),
    screenshotUrl: text("screenshot_url"),
    errorMessage: text("error_message"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    credIdx: index("logs_cred_idx").on(t.credentialId),
    runTimeIdx: index("logs_run_time_idx").on(t.runTime),
  })
);

export const loginLogsRelations = relations(loginLogs, ({ one }) => ({
  credential: one(credentials, {
    fields: [loginLogs.credentialId],
    references: [credentials.id],
  }),
}));

// ─── Audit Logs ───────────────────────────────────────────────────────────
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    createdAtIdx: index("audit_created_idx").on(t.createdAt),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── User Settings ─────────────────────────────────────────────────────────
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  emailProvider: text("email_provider").default("disabled").notNull(),
  resendApiKey: text("resend_api_key"),
  resendFrom: text("resend_from"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFrom: text("smtp_from"),
  brevoApiKey: text("brevo_api_key"),
  brevoFrom: text("brevo_from"),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Rate Limits ──────────────────────────────────────────────────────────
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  windowEnd: integer("window_end").notNull(),
});

// ─── Type exports ─────────────────────────────────────────────────────────
export type User        = typeof users.$inferSelect;
export type NewUser     = typeof users.$inferInsert;
export type Session     = typeof sessions.$inferSelect;
export type Credential  = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
export type Schedule    = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type LoginLog    = typeof loginLogs.$inferSelect;
export type AuditLog    = typeof auditLogs.$inferSelect;
export type RateLimit   = typeof rateLimits.$inferSelect;
