"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAny = void 0;
const authorizeAny = (...requiredCapabilities) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const allowed = requiredCapabilities.some((capability) => req.user?.capabilities.includes(capability));
        if (!allowed) {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        next();
    };
};
exports.authorizeAny = authorizeAny;
