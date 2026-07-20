import * as crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

// ─── Password Hashing (PBKDF2) ───────────────────────────────────────────
const PBKDF2_ITERATIONS = 210000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = await pbkdf2(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derivedHash = await pbkdf2(password, salt);
  return timingSafeEqual(derivedHash, hash);
}

async function pbkdf2(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── AES-GCM Encryption for Credentials ──────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export async function encryptCredential(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  // Format: iv:ciphertext:tag (all base64)
  return `${iv.toString("base64")}:${encrypted}:${tag.toString("base64")}`;
}

export async function decryptCredential(encryptedData: string): Promise<string> {
  const key = getEncryptionKey();
  const [ivB64, ciphertext, tagB64] = encryptedData.split(":");

  if (!ivB64 || !ciphertext || !tagB64) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function getEncryptionKey(): Buffer {
  // Uses config.AUTH_SECRET which has a dev fallback — never throws
  return crypto.createHash("sha256").update(config.AUTH_SECRET).digest();
}

// ─── JWT Tokens ───────────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for revocation
}

const JWT_EXPIRES_IN = "7d";

export async function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const secret = config.AUTH_SECRET;
  const key = new TextEncoder().encode(secret);
  const jti = crypto.randomUUID();

  const jwt = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(key);

  return jwt;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = config.AUTH_SECRET;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);

    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Rate Limiting (DB-backed) ───────────────────────────────────────────
export interface RateLimitConfig {
  key: string;
  maxAttempts: number;
  windowMs: number;
}

export function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 16);
}

export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

// ─── Bot Detection (30+ patterns) ────────────────────────────────────────
const MALICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /import\s*\(.*\)/i,
  /union.*select/i,
  /select.*from/i,
  /insert.*into/i,
  /delete.*from/i,
  /drop.*table/i,
  /create.*table/i,
  /alter.*table/i,
  /update.*set/i,
  /exec\s*\(/i,
  /execute\s*\(/i,
  /xp_cmdshell/i,
  /\/\.\.\//g,
  /etc\/passwd/i,
  /\/etc\/shadow/i,
  /proc\/self/i,
  /%00/i,
  /%0a/i,
  /%0d/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<applet/i,
  /<meta/i,
  /<link/i,
  /data:text\/html/i,
  /vbscript:/i,
  /livescript:/i,
  /mocha:/i,
];

export function detectMaliciousInput(input: string): boolean {
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

// ─── Utilities ────────────────────────────────────────────────────────────
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
