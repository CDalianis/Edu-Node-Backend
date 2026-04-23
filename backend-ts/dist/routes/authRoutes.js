"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const authService_1 = require("../services/authService");
const authSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1)
});
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post("/authenticate", async (req, res, next) => {
    try {
        const payload = authSchema.parse(req.body);
        const response = await (0, authService_1.authenticateUser)(payload.username, payload.password);
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
});
