import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { authorizeAny } from "../middleware/authorize";
import { createUser, getUserByUuid } from "../services/userService";

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/),
  roleId: z.union([z.number(), z.string()])
});

export const userRoutes = Router();
const readParam = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value ?? "");

userRoutes.post("/", async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const created = await createUser({
      username: payload.username,
      password: payload.password,
      roleId: String(payload.roleId)
    });
    res.status(201).location(`${req.baseUrl}/${created.uuid}`).json(created);
  } catch (error) {
    next(error);
  }
});

userRoutes.get("/:uuid", authenticate, authorizeAny("VIEW_USER"), async (req, res, next) => {
  try {
    const user = await getUserByUuid(readParam(req.params.uuid));
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});
