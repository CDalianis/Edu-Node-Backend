import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";
import { binaryToUuid, uuidToBinary } from "../utils/uuid";

type CreateUserInput = {
  username: string;
  password: string;
  roleId: string;
};

export const createUser = async (input: CreateUserInput): Promise<{ uuid: string; username: string; role: string }> => {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw new HttpError(409, "User already exists");
  }

  const role = await prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
  if (!role) {
    throw new HttpError(400, "Invalid role id");
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);
  const userUuid = randomUUID();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      uuid: uuidToBinary(userUuid),
      username: input.username,
      password: hashedPassword,
      roleId: BigInt(input.roleId),
      createdAt: now,
      updatedAt: now
    }
  });

  return {
    uuid: binaryToUuid(user.uuid),
    username: user.username,
    role: role.name
  };
};

export const getUserByUuid = async (uuid: string): Promise<{ uuid: string; username: string; role: string }> => {
  const user = await prisma.user.findFirst({
    where: {
      uuid: uuidToBinary(uuid),
      deleted: false
    }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const role = await prisma.role.findUnique({ where: { id: user.roleId } });
  if (!role) {
    throw new HttpError(404, "Role not found");
  }

  return {
    uuid: binaryToUuid(user.uuid),
    username: user.username,
    role: role.name
  };
};
