import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

export const authenticateUser = async (username: string, password: string): Promise<{ token: string }> => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true }
  });

  if (!user || user.deleted) {
    throw new HttpError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    { role: user.role.name },
    Buffer.from(env.jwtSecretKey, "base64"),
    {
      issuer: "https://api.codingfactory.gr",
      subject: user.username,
      expiresIn: Math.floor(env.jwtExpirationMs / 1000)
    }
  );

  return { token };
};
