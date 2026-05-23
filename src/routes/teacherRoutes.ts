import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { env } from "../config/env";
import { authenticate } from "../middleware/auth";
import { authorizeAny } from "../middleware/authorize";
import {
  attachAmkaFile,
  createTeacher,
  getTeacherByUuid,
  getTeachers,
  softDeleteTeacher,
  updateTeacher
} from "../services/teacherService";

const createTeacherSchema = z.object({
  firstname: z.string().min(2),
  lastname: z.string().min(2),
  vat: z.string().regex(/^\d{9,}$/),
  regionId: z.union([z.number(), z.string()]),
  userInsertDTO: z.object({
    username: z.string().min(3).max(20),
    password: z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/),
    roleId: z.union([z.number(), z.string()])
  }),
  personalInfoInsertDTO: z.object({
    amka: z.string().regex(/^\d{11}$/),
    identityNumber: z.string().min(1),
    placeOfBirth: z.string().min(1),
    municipalityOfRegistration: z.string().min(1)
  })
});

const updateTeacherSchema = z.object({
  uuid: z.string().uuid(),
  firstname: z.string().min(2),
  lastname: z.string().min(2),
  vat: z.string().regex(/^\d{9,}$/),
  regionId: z.union([z.number(), z.string()]),
  userUpdateDTO: z.object({
    username: z.string().min(2).max(20),
    password: z.string().regex(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&+=])^.{8,}$/)
  }),
  personalInfoUpdateDTO: z.object({
    amka: z.string().regex(/^\d{11}$/),
    identityNumber: z.string().min(1),
    placeOfBirth: z.string().min(1),
    municipalityOfRegistration: z.string().min(1)
  })
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, env.fileUploadDir);
    },
    filename: (_req, _file, callback) => {
      callback(null, randomUUID());
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const teacherRoutes = Router();
const readParam = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value ?? "");

teacherRoutes.post("/", async (req, res, next) => {
  try {
    const payload = createTeacherSchema.parse(req.body);
    const created = await createTeacher({
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
  } catch (error) {
    next(error);
  }
});

teacherRoutes.post("/:uuid/amka-file", upload.single("amkaFile"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "amkaFile is required" });
      return;
    }
    await attachAmkaFile(readParam(req.params.uuid), req.file);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

teacherRoutes.put("/:uuid", authenticate, authorizeAny("EDIT_TEACHER"), async (req, res, next) => {
  try {
    const payload = updateTeacherSchema.parse({
      ...req.body,
      uuid: readParam(req.params.uuid)
    });
    const updated = await updateTeacher({
      ...payload,
      regionId: String(payload.regionId)
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

teacherRoutes.get("/", authenticate, authorizeAny("VIEW_TEACHERS"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 0);
    const size = Number(req.query.size ?? 5);
    const response = await getTeachers(page, size);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

teacherRoutes.get("/:uuid", authenticate, authorizeAny("VIEW_TEACHER", "VIEW_ONLY_TEACHER"), async (req, res, next) => {
  try {
    const teacher = await getTeacherByUuid(readParam(req.params.uuid));
    res.status(200).json(teacher);
  } catch (error) {
    next(error);
  }
});

teacherRoutes.delete("/:uuid", authenticate, authorizeAny("DELETE_TEACHER"), async (req, res, next) => {
  try {
    const deleted = await softDeleteTeacher(readParam(req.params.uuid));
    res.status(200).json(deleted);
  } catch (error) {
    next(error);
  }
});
