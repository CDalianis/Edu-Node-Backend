"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const authRoutes_1 = require("./routes/authRoutes");
const teacherRoutes_1 = require("./routes/teacherRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({ origin: env_1.env.allowedOrigins.length > 0 ? env_1.env.allowedOrigins : "*" }));
exports.app.use((0, morgan_1.default)("dev"));
exports.app.use(express_1.default.json());
exports.app.use("/api/v1/auth", authRoutes_1.authRoutes);
exports.app.use("/api/v1/users", userRoutes_1.userRoutes);
exports.app.use("/api/v1/teachers", teacherRoutes_1.teacherRoutes);
exports.app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
exports.app.use(errorHandler_1.notFoundHandler);
exports.app.use(errorHandler_1.errorHandler);
