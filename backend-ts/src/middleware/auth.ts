import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

type JwtPayload = {
  sub: string;
  role?: string;
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, Buffer.from(env.jwtSecretKey, "base64")) as JwtPayload;
    const username = payload.sub;
    if (!username) {
      res.status(401).json({ message: "Invalid token subject" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            capabilities: { include: { capability: true } }
          }
        },
        teacher: true
      }
    });

    if (!user || user.deleted) {
      res.status(401).json({ message: "User not found or disabled" });
      return;
    }

    req.user = {
      username,
      role: user.role.name,
      capabilities: user.role.capabilities.map((c) => c.capability.name),
      teacherUuid: user.teacher?.uuid ? Buffer.from(user.teacher.uuid).toString("hex") : undefined
    };
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
