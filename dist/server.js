"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const app_1 = require("./app");
const env_1 = require("./config/env");
fs_1.default.mkdirSync(env_1.env.fileUploadDir, { recursive: true });
app_1.app.listen(env_1.env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`TypeScript backend listening on port ${env_1.env.port}`);
});
