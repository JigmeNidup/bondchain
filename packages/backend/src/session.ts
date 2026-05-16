import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getConfig } from "./config.js";

export type BondChainSession = {
  didKey: string;
  cidHash?: string;
  fullName?: string;
};

const cookieName = "bondchain_session";
const sessionMaxAgeMs = 15 * 60 * 1000;

export const setSessionCookie = (res: Response, session: BondChainSession) => {
  const config = getConfig();
  const token = jwt.sign(session, config.sessionSecret, { expiresIn: "15m" });

  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAgeMs,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(cookieName);
};

export const readSession = (req: Request): BondChainSession | null => {
  const token = req.cookies?.[cookieName];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getConfig().sessionSecret);
    if (typeof decoded === "object" && typeof decoded.didKey === "string") {
      return {
        didKey: decoded.didKey,
        cidHash: typeof decoded.cidHash === "string" ? decoded.cidHash : undefined,
        fullName: typeof decoded.fullName === "string" ? decoded.fullName : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "NDI session required" });
    return;
  }

  res.locals.session = session;
  next();
};
