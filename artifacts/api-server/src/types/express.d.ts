import "express";

declare global {
  namespace Express {
    interface Request {
      /** User id from JWT `sub` (username). */
      authUserId?: string;
    }
  }
}

export {};
