declare namespace Express {
  interface Request {
    user?: {
      username: string;
      role: string;
      capabilities: string[];
      teacherUuid?: string;
    };
  }
}
