"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByUuid = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_1 = require("../config/prisma");
const httpError_1 = require("../utils/httpError");
const uuid_1 = require("../utils/uuid");
const createUser = async (input) => {
    const existing = await prisma_1.prisma.user.findUnique({ where: { username: input.username } });
    if (existing) {
        throw new httpError_1.HttpError(409, "User already exists");
    }
    const role = await prisma_1.prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
    if (!role) {
        throw new httpError_1.HttpError(400, "Invalid role id");
    }
    const hashedPassword = await bcryptjs_1.default.hash(input.password, 12);
    const userUuid = (0, crypto_1.randomUUID)();
    const now = new Date();
    const user = await prisma_1.prisma.user.create({
        data: {
            uuid: (0, uuid_1.uuidToBinary)(userUuid),
            username: input.username,
            password: hashedPassword,
            roleId: BigInt(input.roleId),
            createdAt: now,
            updatedAt: now
        }
    });
    return {
        uuid: (0, uuid_1.binaryToUuid)(user.uuid),
        username: user.username,
        role: role.name
    };
};
exports.createUser = createUser;
const getUserByUuid = async (uuid) => {
    const user = await prisma_1.prisma.user.findFirst({
        where: {
            uuid: (0, uuid_1.uuidToBinary)(uuid),
            deleted: false
        }
    });
    if (!user) {
        throw new httpError_1.HttpError(404, "User not found");
    }
    const role = await prisma_1.prisma.role.findUnique({ where: { id: user.roleId } });
    if (!role) {
        throw new httpError_1.HttpError(404, "Role not found");
    }
    return {
        uuid: (0, uuid_1.binaryToUuid)(user.uuid),
        username: user.username,
        role: role.name
    };
};
exports.getUserByUuid = getUserByUuid;
