import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: "Resource not found" });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Unexpected server error" });
};
