import { NextFunction, Request, Response } from "express";

export const authorizeAny = (...requiredCapabilities: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const allowed = requiredCapabilities.some((capability) => req.user?.capabilities.includes(capability));
    if (!allowed) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    next();
  };
};
