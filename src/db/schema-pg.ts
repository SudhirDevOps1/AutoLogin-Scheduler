import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    lockedUntil: bigint("locked_until", { mode: "number" }),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
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

// ─── Sessions ──────────────────────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  })
);

// ─── Credentials ───────────────────────────────────────────────────────────
export const credentials = pgTable(
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
    lastLogin: bigint("last_login", { mode: "number" }),
    status: text("status").default("active").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    userIdx: index("credentials_user_idx").on(t.userId),
  })
);

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  user: one(users, { fields: [credentials.userId], references: [users.id] }),
  schedules: many(schedules),
  logs: many(loginLogs),
}));

// ─── Schedules ──────────────────────────────────────────────────────────────
export const schedules = pgTable(
  "schedules",
  {
    id: text("id").primaryKey(),
    credentialId: text("credential_id")
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    cronExpr: text("cron_expr").notNull(),
    executionMode: text("execution_mode").default("auto").notNull(),
    nextRun: bigint("next_run", { mode: "number" }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    alertOnFailure: boolean("alert_on_failure").default(true).notNull(),
    alertOnSuccess: boolean("alert_on_success").default(false).notNull(),
    takeScreenshot: boolean("take_screenshot").default(true).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    credIdx: index("schedules_cred_idx").on(t.credentialId),
    nextRunIdx: index("schedules_next_run_idx").on(t.nextRun),
  })
);

export const schedulesRelations = relations(schedules, ({ one }) => ({
  credential: one(credentials, { fields: [schedules.credentialId], references: [credentials.id] }),
}));

// ─── Login Logs ─────────────────────────────────────────────────────────────
export const loginLogs = pgTable(
  "login_logs",
  {
    id: text("id").primaryKey(),
    credentialId: text("credential_id")
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    runTime: bigint("run_time", { mode: "number" }).notNull(),
    durationMs: integer("duration_ms"),
    success: boolean("success").notNull(),
    screenshotKey: text("screenshot_key"),
    screenshotUrl: text("screenshot_url"),
    errorMessage: text("error_message"),
    ipAddress: text("ip_address"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    credIdx: index("logs_cred_idx").on(t.credentialId),
    runTimeIdx: index("logs_run_time_idx").on(t.runTime),
  })
);

export const loginLogsRelations = relations(loginLogs, ({ one }) => ({
  credential: one(credentials, { fields: [loginLogs.credentialId], references: [credentials.id] }),
}));

// ─── Audit Logs ─────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
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
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    createdAtIdx: index("audit_created_idx").on(t.createdAt),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ─── User Settings ─────────────────────────────────────────────────────────
export const userSettings = pgTable("user_settings", {
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
  notificationEmail: text("notification_email"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ─── Rate Limits ────────────────────────────────────────────────────────────
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  windowEnd: bigint("window_end", { mode: "number" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type LoginLog = typeof loginLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type RateLimit = typeof rateLimits.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
