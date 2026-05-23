import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";
import { binaryToUuid, uuidToBinary } from "../utils/uuid";

type TeacherInsertInput = {
  firstname: string;
  lastname: string;
  vat: string;
  regionId: string;
  userInsertDTO: {
    username: string;
    password: string;
    roleId: string;
  };
  personalInfoInsertDTO: {
    amka: string;
    identityNumber: string;
    placeOfBirth: string;
    municipalityOfRegistration: string;
  };
};

type TeacherUpdateInput = {
  uuid: string;
  firstname: string;
  lastname: string;
  vat: string;
  regionId: string;
  userUpdateDTO: {
    username: string;
    password: string;
  };
  personalInfoUpdateDTO: {
    amka: string;
    identityNumber: string;
    placeOfBirth: string;
    municipalityOfRegistration: string;
  };
};

const toReadOnly = (teacher: any, regionName = "") => ({
  uuid: binaryToUuid(teacher.uuid),
  firstname: teacher.firstname,
  lastname: teacher.lastname,
  vat: teacher.vat,
  region: regionName
});

export const createTeacher = async (input: TeacherInsertInput) => {
  const now = new Date();
  const teacherUuid = randomUUID();
  const hashedPassword = await bcrypt.hash(input.userInsertDTO.password, 12);

  const [region, role, existingVat, existingUsername, existingAmka] = await Promise.all([
    prisma.region.findUnique({ where: { id: BigInt(input.regionId) } }),
    prisma.role.findUnique({ where: { id: BigInt(input.userInsertDTO.roleId) } }),
    prisma.teacher.findFirst({ where: { vat: input.vat } }),
    prisma.user.findUnique({ where: { username: input.userInsertDTO.username } }),
    prisma.personalInfo.findUnique({ where: { amka: input.personalInfoInsertDTO.amka } })
  ]);

  if (!region) throw new HttpError(400, "Invalid region id");
  if (!role) throw new HttpError(400, "Invalid role id");
  if (existingVat) throw new HttpError(409, "Teacher already exists");
  if (existingUsername) throw new HttpError(409, "User already exists");
  if (existingAmka) throw new HttpError(409, "Personal information already exists");

  const teacher = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        uuid: uuidToBinary(randomUUID()),
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
        uuid: uuidToBinary(teacherUuid),
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

export const getTeacherByUuid = async (uuid: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: { uuid: uuidToBinary(uuid), deleted: false },
  });

  if (!teacher) {
    throw new HttpError(404, "Teacher not found");
  }

  const region = teacher.regionId ? await prisma.region.findUnique({ where: { id: teacher.regionId } }) : null;
  return toReadOnly(teacher, region?.name ?? "");
};

export const getTeachers = async (page: number, size: number) => {
  const [items, totalElements] = await Promise.all([
    prisma.teacher.findMany({
      where: { deleted: false },
      skip: page * size,
      take: size,
      orderBy: { lastname: "asc" }
    }),
    prisma.teacher.count({ where: { deleted: false } })
  ]);

  return {
    content: await Promise.all(items.map(async (item) => {
      const region = item.regionId ? await prisma.region.findUnique({ where: { id: item.regionId } }) : null;
      return toReadOnly(item, region?.name ?? "");
    })),
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size)
  };
};

export const updateTeacher = async (input: TeacherUpdateInput) => {
  const existing = await prisma.teacher.findFirst({
    where: { uuid: uuidToBinary(input.uuid), deleted: false },
  });
  if (!existing || !existing.personalInfoId) {
    throw new HttpError(404, "Teacher not found");
  }

  const now = new Date();
  const hashedPassword = await bcrypt.hash(input.userUpdateDTO.password, 12);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: {
        username: input.userUpdateDTO.username,
        password: hashedPassword,
        updatedAt: now
      }
    });

    await tx.personalInfo.update({
      where: { id: existing.personalInfoId! },
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

  const region = updated.regionId ? await prisma.region.findUnique({ where: { id: updated.regionId } }) : null;
  return toReadOnly(updated, region?.name ?? "");
};

export const softDeleteTeacher = async (uuid: string) => {
  const existing = await prisma.teacher.findFirst({
    where: { uuid: uuidToBinary(uuid), deleted: false },
  });
  if (!existing) {
    throw new HttpError(404, "Teacher not found");
  }

  const now = new Date();
  const deleted = await prisma.teacher.update({
    where: { id: existing.id },
    data: {
      deleted: true,
      deletedAt: now,
      updatedAt: now
    }
  });

  const region = deleted.regionId ? await prisma.region.findUnique({ where: { id: deleted.regionId } }) : null;
  return toReadOnly(deleted, region?.name ?? "");
};

export const attachAmkaFile = async (
  teacherUuid: string,
  file: {
    originalname: string;
    filename: string;
    path: string;
    mimetype: string;
  }
) => {
  const teacher = await prisma.teacher.findFirst({
    where: { uuid: uuidToBinary(teacherUuid), deleted: false },
  });
  if (!teacher || !teacher.personalInfoId) {
    throw new HttpError(404, "Teacher not found");
  }

  const now = new Date();
  const extension = file.originalname.includes(".") ? file.originalname.split(".").pop() ?? null : null;

  const attachment = await prisma.attachment.create({
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

  await prisma.personalInfo.update({
    where: { id: teacher.personalInfoId },
    data: {
      amkaFileId: attachment.id,
      updatedAt: now
    }
  });
};
