"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const httpError_1 = require("../utils/httpError");
const authenticateUser = async (username, password) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { username },
        include: { role: true }
    });
    if (!user || user.deleted) {
        throw new httpError_1.HttpError(401, "Invalid credentials");
    }
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid) {
        throw new httpError_1.HttpError(401, "Invalid credentials");
    }
    const token = jsonwebtoken_1.default.sign({ role: user.role.name }, Buffer.from(env_1.env.jwtSecretKey, "base64"), {
        issuer: "https://api.codingfactory.gr",
        subject: user.username,
        expiresIn: Math.floor(env_1.env.jwtExpirationMs / 1000)
    });
    return { token };
};
exports.authenticateUser = authenticateUser;
