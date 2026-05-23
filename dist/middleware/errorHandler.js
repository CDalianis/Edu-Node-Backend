"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const httpError_1 = require("../utils/httpError");
const notFoundHandler = (_req, res) => {
    res.status(404).json({ message: "Resource not found" });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof httpError_1.HttpError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }
    if (err instanceof Error) {
        res.status(500).json({ message: err.message });
        return;
    }
    res.status(500).json({ message: "Unexpected server error" });
};
exports.errorHandler = errorHandler;
