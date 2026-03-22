import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { getJwtSecret } from "../lib/auth-config";
import { validatePassword, validateUsername } from "../lib/auth-validation";
import { hashPassword, verifyPassword } from "../lib/password";

const router: IRouter = Router();

const TOKEN_EXPIRY_SEC = 60 * 60 * 24 * 7; // 7 days

function issueToken(userId: string): string {
  const secret = getJwtSecret();
  return jwt.sign({ sub: userId }, secret, {
    expiresIn: TOKEN_EXPIRY_SEC,
  });
}

router.post("/signup", async (req, res) => {
  const body = req.body as { username?: unknown; password?: unknown };
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const uErr = validateUsername(username);
  if (uErr) {
    res.status(400).json({ error: "validation", message: uErr });
    return;
  }
  const pErr = validatePassword(password);
  if (pErr) {
    res.status(400).json({ error: "validation", message: pErr });
    return;
  }

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        error: "username_taken",
        message: "That username is already taken.",
      });
      return;
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(usersTable).values({
      id,
      username,
      passwordHash,
    });

    const accessToken = issueToken(id);

    res.status(201).json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: TOKEN_EXPIRY_SEC,
      user: { id, username },
    });
  } catch (err) {
    req.log.error({ err }, "Signup failed");
    res.status(500).json({ error: "internal_error", message: "Could not create account" });
  }
});

router.post("/login", async (req, res) => {
  const body = req.body as { username?: unknown; password?: unknown };
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    res.status(400).json({
      error: "invalid_body",
      message: "Username and password are required.",
    });
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err) {
    res.status(503).json({
      error: "auth_not_configured",
      message: err instanceof Error ? err.message : "JWT misconfigured",
    });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    const user = rows[0];
    if (!user) {
      res.status(401).json({
        error: "invalid_credentials",
        message: "Invalid username or password",
      });
      return;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({
        error: "invalid_credentials",
        message: "Invalid username or password",
      });
      return;
    }

    const accessToken = issueToken(user.id);

    res.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: TOKEN_EXPIRY_SEC,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "internal_error", message: "Sign in failed" });
  }
});

export default router;
