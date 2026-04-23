"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const teacherService_1 = require("../services/teacherService");
const createTeacherSchema = zod_1.z.object({
    firstname: zod_1.z.string().min(2),
    lastname: zod_1.z.string().min(2),
    vat: zod_1.z.string().regex(/^\d{9,}$/),
    regionId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    userInsertDTO: zod_1.z.object({
        username: zod_1.z.string().min(3).max(20),
        password: zod_1.z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/),
        roleId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()])
    }),
    personalInfoInsertDTO: zod_1.z.object({
        amka: zod_1.z.string().regex(/^\d{11}$/),
        identityNumber: zod_1.z.string().min(1),
        placeOfBirth: zod_1.z.string().min(1),
        municipalityOfRegistration: zod_1.z.string().min(1)
    })
});
const updateTeacherSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    firstname: zod_1.z.string().min(2),
    lastname: zod_1.z.string().min(2),
    vat: zod_1.z.string().regex(/^\d{9,}$/),
    regionId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    userUpdateDTO: zod_1.z.object({
        username: zod_1.z.string().min(2).max(20),
        password: zod_1.z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/)
    }),
    personalInfoUpdateDTO: zod_1.z.object({
        amka: zod_1.z.string().regex(/^\d{11}$/),
        identityNumber: zod_1.z.string().min(1),
        placeOfBirth: zod_1.z.string().min(1),
        municipalityOfRegistration: zod_1.z.string().min(1)
    })
});
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, callback) => {
            callback(null, env_1.env.fileUploadDir);
        },
        filename: (_req, _file, callback) => {
            callback(null, (0, crypto_1.randomUUID)());
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
exports.teacherRoutes = (0, express_1.Router)();
const readParam = (value) => (Array.isArray(value) ? value[0] : value ?? "");
exports.teacherRoutes.post("/", async (req, res, next) => {
    try {
        const payload = createTeacherSchema.parse(req.body);
        const created = await (0, teacherService_1.createTeacher)({
            firstname: payload.firstname,
            lastname: payload.lastname,
            vat: payload.vat,
            regionId: String(payload.regionId),
            userInsertDTO: {
                username: payload.userInsertDTO.username,
                password: payload.userInsertDTO.password,
                roleId: String(payload.userInsertDTO.roleId)
            },
            personalInfoInsertDTO: payload.personalInfoInsertDTO
        });
        res.status(201).location(`${req.baseUrl}/${created.uuid}`).json(created);
    }
    catch (error) {
        next(error);
    }
});
exports.teacherRoutes.post("/:uuid/amka-file", upload.single("amkaFile"), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "amkaFile is required" });
            return;
        }
        await (0, teacherService_1.attachAmkaFile)(readParam(req.params.uuid), req.file);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
exports.teacherRoutes.put("/:uuid", auth_1.authenticate, (0, authorize_1.authorizeAny)("EDIT_TEACHER"), async (req, res, next) => {
    try {
        const payload = updateTeacherSchema.parse({
            ...req.body,
            uuid: readParam(req.params.uuid)
        });
        const updated = await (0, teacherService_1.updateTeacher)({
            ...payload,
            regionId: String(payload.regionId)
        });
        res.status(200).json(updated);
    }
    catch (error) {
        next(error);
    }
});
exports.teacherRoutes.get("/", auth_1.authenticate, (0, authorize_1.authorizeAny)("VIEW_TEACHERS"), async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 0);
        const size = Number(req.query.size ?? 5);
        const response = await (0, teacherService_1.getTeachers)(page, size);
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
});
exports.teacherRoutes.get("/:uuid", auth_1.authenticate, (0, authorize_1.authorizeAny)("VIEW_TEACHER", "VIEW_ONLY_TEACHER"), async (req, res, next) => {
    try {
        const teacher = await (0, teacherService_1.getTeacherByUuid)(readParam(req.params.uuid));
        res.status(200).json(teacher);
    }
    catch (error) {
        next(error);
    }
});
exports.teacherRoutes.delete("/:uuid", auth_1.authenticate, (0, authorize_1.authorizeAny)("DELETE_TEACHER"), async (req, res, next) => {
    try {
        const deleted = await (0, teacherService_1.softDeleteTeacher)(readParam(req.params.uuid));
        res.status(200).json(deleted);
    }
    catch (error) {
        next(error);
    }
});
