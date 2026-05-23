import { Router } from "express";
import { z } from "zod";
import { authenticateUser } from "../services/authService";

const authSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const authRoutes = Router();

authRoutes.post("/authenticate", async (req, res, next) => {
  try {
    const payload = authSchema.parse(req.body);
    const response = await authenticateUser(payload.username, payload.password);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});
