import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/auth-config";

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "unauthorized", message: "Missing or invalid token" });
    return;
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    res
      .status(401)
      .json({ error: "unauthorized", message: "Missing or invalid token" });
    return;
  }
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    const sub = decoded.sub;
    if (typeof sub !== "string" || !sub) {
      res.status(401).json({
        error: "unauthorized",
        message: "Invalid token payload",
      });
      return;
    }
    req.authUserId = sub;
    next();
  } catch {
    res
      .status(401)
      .json({ error: "unauthorized", message: "Invalid or expired token" });
  }
};
