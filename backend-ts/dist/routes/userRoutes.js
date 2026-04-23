"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const userService_1 = require("../services/userService");
const createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20),
    password: zod_1.z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/),
    roleId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()])
});
exports.userRoutes = (0, express_1.Router)();
const readParam = (value) => (Array.isArray(value) ? value[0] : value ?? "");
exports.userRoutes.post("/", async (req, res, next) => {
    try {
        const payload = createUserSchema.parse(req.body);
        const created = await (0, userService_1.createUser)({
            username: payload.username,
            password: payload.password,
            roleId: String(payload.roleId)
        });
        res.status(201).location(`${req.baseUrl}/${created.uuid}`).json(created);
    }
    catch (error) {
        next(error);
    }
});
exports.userRoutes.get("/:uuid", auth_1.authenticate, (0, authorize_1.authorizeAny)("VIEW_USER"), async (req, res, next) => {
    try {
        const user = await (0, userService_1.getUserByUuid)(readParam(req.params.uuid));
        res.status(200).json(user);
    }
    catch (error) {
        next(error);
    }
});
