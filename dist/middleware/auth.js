"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const authenticate = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing bearer token" });
        return;
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = jsonwebtoken_1.default.verify(token, Buffer.from(env_1.env.jwtSecretKey, "base64"));
        const username = payload.sub;
        if (!username) {
            res.status(401).json({ message: "Invalid token subject" });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (_error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
