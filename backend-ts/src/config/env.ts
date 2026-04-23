import dotenv from "dotenv";

dotenv.config();

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required("DATABASE_URL"),
  jwtSecretKey: required("JWT_SECRET_KEY"),
  jwtExpirationMs: Number(process.env.JWT_EXPIRATION_MS ?? 10800000),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  fileUploadDir: process.env.FILE_UPLOAD_DIR ?? "uploads"
};
