import { db } from "@/db";
import { credentials, schedules, loginLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptCredential, generateId } from "@/lib/security";

/** FAKE_DATA=false → pure production. No fake seed, no demo endpoints. */
export const isFakeData = () => process.env.FAKE_DATA !== "false";

/** Legacy alias — same check. */
export const isDemoMode = isFakeData;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const demoCredentials = [
  {
    name: "Mega.nz — Work Files",
    siteUrl: "https://mega.nz/login",
    username: "demo.work@example.com",
    cronExpr: "every 6 hours",
    nextIn: 2 * HOUR,
    status: "active",
    enabled: true,
    alertOnFailure: true,
    alertOnSuccess: false,
    takeScreenshot: true,
  },
  {
    name: "Google Drive — Photos",
    siteUrl: "https://drive.google.com",
    username: "photos.demo@example.com",
    cronExpr: "every 1 day",
    nextIn: 11 * HOUR,
    status: "active",
    enabled: true,
    alertOnFailure: true,
    alertOnSuccess: true,
    takeScreenshot: false,
  },
  {
    name: "Dropbox — Team Backup",
    siteUrl: "https://www.dropbox.com/login",
    username: "backup.demo@example.com",
    cronExpr: "every 7 days",
    nextIn: 3 * DAY,
    status: "failed",
    enabled: true,
    alertOnFailure: true,
    alertOnSuccess: false,
    takeScreenshot: true,
  },
  {
    name: "GitHub — Automation Bot",
    siteUrl: "https://github.com/login",
    username: "autologin-demo-bot",
    cronExpr: "every 30 minutes",
    nextIn: 18 * 60 * 1000,
    status: "active",
    enabled: true,
    alertOnFailure: true,
    alertOnSuccess: false,
    takeScreenshot: true,
  },
  {
    name: "pCloud — Media Archive",
    siteUrl: "https://my.pcloud.com",
    username: "media.demo@example.com",
    cronExpr: "every 30 days",
    nextIn: 21 * DAY,
    status: "active",
    enabled: true,
    alertOnFailure: true,
    alertOnSuccess: false,
    takeScreenshot: false,
  },
  {
    name: "OneDrive — Client Docs",
    siteUrl: "https://login.live.com",
    username: "clients.demo@example.com",
    cronExpr: "every 1 day",
    nextIn: 20 * HOUR,
    status: "paused",
    enabled: false,
    alertOnFailure: true,
    alertOnSuccess: false,
    takeScreenshot: true,
  },
] as const;

const failureMessages = [
  "Two-factor authentication required",
  "Timeout waiting for login selector",
  "Site structure changed — selector no longer matches",
  "CAPTCHA challenge detected",
];

export interface DemoSeedResult {
  seeded: boolean;
  credentials: number;
  schedules: number;
  logs: number;
}

export async function seedDemoWorkspace(
  userId: string,
  options: { force?: boolean } = {}
): Promise<DemoSeedResult> {
  if (!isDemoMode()) {
    return { seeded: false, credentials: 0, schedules: 0, logs: 0 };
  }

  const existing = await db.query.credentials.findFirst({
    where: eq(credentials.userId, userId),
  });

  if (existing && !options.force) {
    return { seeded: false, credentials: 0, schedules: 0, logs: 0 };
  }

  if (options.force) {
    // Schedules and logs cascade from credentials.
    await db.delete(credentials).where(eq(credentials.userId, userId));
  }

  const now = Date.now();
  const encryptedPassword = await encryptCredential("DemoOnly!2026");
  const credentialRows = demoCredentials.map((item, index) => ({
    id: generateId(),
    userId,
    name: item.name,
    siteUrl: item.siteUrl,
    username: item.username,
    encryptedPassword,
    loginSelector: "input[type='email'], input[name='username']",
    passwordSelector: "input[type='password']",
    submitSelector: "button[type='submit']",
    successIndicator: "[data-authenticated='true'], nav[aria-label='Account']",
    lastLogin: now - (index + 1) * 2 * HOUR,
    status: item.status,
    createdAt: now - (14 - index) * DAY,
  }));

  await db.insert(credentials).values(credentialRows);

  const scheduleRows = credentialRows.map((credential, index) => {
    const config = demoCredentials[index];
    return {
      id: generateId(),
      credentialId: credential.id,
      cronExpr: config.cronExpr,
      nextRun: now + config.nextIn,
      enabled: config.enabled,
      alertOnFailure: config.alertOnFailure,
      alertOnSuccess: config.alertOnSuccess,
      takeScreenshot: config.takeScreenshot,
      createdAt: now - (10 - index) * DAY,
    };
  });

  await db.insert(schedules).values(scheduleRows);

  // 42 deterministic-looking events over the last two weeks.
  const logRows = Array.from({ length: 42 }, (_, index) => {
    const credential = credentialRows[index % credentialRows.length];
    const shouldFail = index % 9 === 0 || index === 13;
    const runTime = now - (index + 1) * 7.5 * HOUR;
    const screenshotEnabled = demoCredentials[index % demoCredentials.length].takeScreenshot;
    const screenshotKey = screenshotEnabled
      ? `demo/screenshots/${credential.id}/run-${index + 1}.png`
      : null;

    return {
      id: generateId(),
      credentialId: credential.id,
      runTime,
      durationMs: 2180 + ((index * 613) % 5900),
      success: !shouldFail,
      screenshotKey,
      screenshotUrl: null,
      errorMessage: shouldFail
        ? failureMessages[index % failureMessages.length]
        : null,
      ipAddress: "demo-edge",
      createdAt: runTime,
    };
  });

  await db.insert(loginLogs).values(logRows);

  return {
    seeded: true,
    credentials: credentialRows.length,
    schedules: scheduleRows.length,
    logs: logRows.length,
  };
}
