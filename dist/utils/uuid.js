"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryToUuid = exports.uuidToBinary = void 0;
const uuidToBinary = (uuid) => {
    const hex = uuid.replace(/-/g, "");
    const buffer = Buffer.from(hex, "hex");
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return new Uint8Array(arrayBuffer);
};
exports.uuidToBinary = uuidToBinary;
const binaryToUuid = (binary) => {
    const hex = Buffer.from(binary).toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
exports.binaryToUuid = binaryToUuid;
