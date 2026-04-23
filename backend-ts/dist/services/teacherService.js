"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachAmkaFile = exports.softDeleteTeacher = exports.updateTeacher = exports.getTeachers = exports.getTeacherByUuid = exports.createTeacher = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_1 = require("../config/prisma");
const httpError_1 = require("../utils/httpError");
const uuid_1 = require("../utils/uuid");
const toReadOnly = (teacher, regionName = "") => ({
    uuid: (0, uuid_1.binaryToUuid)(teacher.uuid),
    firstname: teacher.firstname,
    lastname: teacher.lastname,
    vat: teacher.vat,
    region: regionName
});
const createTeacher = async (input) => {
    const now = new Date();
    const teacherUuid = (0, crypto_1.randomUUID)();
    const hashedPassword = await bcryptjs_1.default.hash(input.userInsertDTO.password, 12);
    const [region, role, existingVat, existingUsername, existingAmka] = await Promise.all([
        prisma_1.prisma.region.findUnique({ where: { id: BigInt(input.regionId) } }),
        prisma_1.prisma.role.findUnique({ where: { id: BigInt(input.userInsertDTO.roleId) } }),
        prisma_1.prisma.teacher.findFirst({ where: { vat: input.vat } }),
        prisma_1.prisma.user.findUnique({ where: { username: input.userInsertDTO.username } }),
        prisma_1.prisma.personalInfo.findUnique({ where: { amka: input.personalInfoInsertDTO.amka } })
    ]);
    if (!region)
        throw new httpError_1.HttpError(400, "Invalid region id");
    if (!role)
        throw new httpError_1.HttpError(400, "Invalid role id");
    if (existingVat)
        throw new httpError_1.HttpError(409, "Teacher already exists");
    if (existingUsername)
        throw new httpError_1.HttpError(409, "User already exists");
    if (existingAmka)
        throw new httpError_1.HttpError(409, "Personal information already exists");
    const teacher = await prisma_1.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: {
                uuid: (0, uuid_1.uuidToBinary)((0, crypto_1.randomUUID)()),
                username: input.userInsertDTO.username,
                password: hashedPassword,
                roleId: BigInt(input.userInsertDTO.roleId),
                createdAt: now,
                updatedAt: now
            }
        });
        const personalInfo = await tx.personalInfo.create({
            data: {
                amka: input.personalInfoInsertDTO.amka,
                identityNumber: input.personalInfoInsertDTO.identityNumber,
                placeOfBirth: input.personalInfoInsertDTO.placeOfBirth,
                municipalityOfRegistration: input.personalInfoInsertDTO.municipalityOfRegistration,
                createdAt: now,
                updatedAt: now
            }
        });
        return tx.teacher.create({
            data: {
                uuid: (0, uuid_1.uuidToBinary)(teacherUuid),
                firstname: input.firstname,
                lastname: input.lastname,
                vat: input.vat,
                regionId: BigInt(input.regionId),
                userId: createdUser.id,
                personalInfoId: personalInfo.id,
                createdAt: now,
                updatedAt: now
            }
        });
    });
    return toReadOnly(teacher, region.name);
};
exports.createTeacher = createTeacher;
const getTeacherByUuid = async (uuid) => {
    const teacher = await prisma_1.prisma.teacher.findFirst({
        where: { uuid: (0, uuid_1.uuidToBinary)(uuid), deleted: false },
    });
    if (!teacher) {
        throw new httpError_1.HttpError(404, "Teacher not found");
    }
    const region = teacher.regionId ? await prisma_1.prisma.region.findUnique({ where: { id: teacher.regionId } }) : null;
    return toReadOnly(teacher, region?.name ?? "");
};
exports.getTeacherByUuid = getTeacherByUuid;
const getTeachers = async (page, size) => {
    const [items, totalElements] = await Promise.all([
        prisma_1.prisma.teacher.findMany({
            where: { deleted: false },
            skip: page * size,
            take: size,
            orderBy: { lastname: "asc" }
        }),
        prisma_1.prisma.teacher.count({ where: { deleted: false } })
    ]);
    return {
        content: await Promise.all(items.map(async (item) => {
            const region = item.regionId ? await prisma_1.prisma.region.findUnique({ where: { id: item.regionId } }) : null;
            return toReadOnly(item, region?.name ?? "");
        })),
        page,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size)
    };
};
exports.getTeachers = getTeachers;
const updateTeacher = async (input) => {
    const existing = await prisma_1.prisma.teacher.findFirst({
        where: { uuid: (0, uuid_1.uuidToBinary)(input.uuid), deleted: false },
    });
    if (!existing || !existing.personalInfoId) {
        throw new httpError_1.HttpError(404, "Teacher not found");
    }
    const now = new Date();
    const hashedPassword = await bcryptjs_1.default.hash(input.userUpdateDTO.password, 12);
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: existing.userId },
            data: {
                username: input.userUpdateDTO.username,
                password: hashedPassword,
                updatedAt: now
            }
        });
        await tx.personalInfo.update({
            where: { id: existing.personalInfoId },
            data: {
                amka: input.personalInfoUpdateDTO.amka,
                identityNumber: input.personalInfoUpdateDTO.identityNumber,
                placeOfBirth: input.personalInfoUpdateDTO.placeOfBirth,
                municipalityOfRegistration: input.personalInfoUpdateDTO.municipalityOfRegistration,
                updatedAt: now
            }
        });
        return tx.teacher.update({
            where: { id: existing.id },
            data: {
                firstname: input.firstname,
                lastname: input.lastname,
                vat: input.vat,
                regionId: BigInt(input.regionId),
                updatedAt: now
            }
        });
    });
    const region = updated.regionId ? await prisma_1.prisma.region.findUnique({ where: { id: updated.regionId } }) : null;
    return toReadOnly(updated, region?.name ?? "");
};
exports.updateTeacher = updateTeacher;
const softDeleteTeacher = async (uuid) => {
    const existing = await prisma_1.prisma.teacher.findFirst({
        where: { uuid: (0, uuid_1.uuidToBinary)(uuid), deleted: false },
    });
    if (!existing) {
        throw new httpError_1.HttpError(404, "Teacher not found");
    }
    const now = new Date();
    const deleted = await prisma_1.prisma.teacher.update({
        where: { id: existing.id },
        data: {
            deleted: true,
            deletedAt: now,
            updatedAt: now
        }
    });
    const region = deleted.regionId ? await prisma_1.prisma.region.findUnique({ where: { id: deleted.regionId } }) : null;
    return toReadOnly(deleted, region?.name ?? "");
};
exports.softDeleteTeacher = softDeleteTeacher;
const attachAmkaFile = async (teacherUuid, file) => {
    const teacher = await prisma_1.prisma.teacher.findFirst({
        where: { uuid: (0, uuid_1.uuidToBinary)(teacherUuid), deleted: false },
    });
    if (!teacher || !teacher.personalInfoId) {
        throw new httpError_1.HttpError(404, "Teacher not found");
    }
    const now = new Date();
    const extension = file.originalname.includes(".") ? file.originalname.split(".").pop() ?? null : null;
    const attachment = await prisma_1.prisma.attachment.create({
        data: {
            filename: file.originalname,
            savedName: file.filename,
            filePath: file.path,
            contentType: file.mimetype,
            extension,
            createdAt: now,
            updatedAt: now
        }
    });
    await prisma_1.prisma.personalInfo.update({
        where: { id: teacher.personalInfoId },
        data: {
            amkaFileId: attachment.id,
            updatedAt: now
        }
    });
};
exports.attachAmkaFile = attachAmkaFile;
