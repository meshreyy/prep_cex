import cors from "cors";
import { env } from "../utils/config";

const allowAll = process.env.CORS_ORIGIN?.trim() === "*";

export const corsMiddleware = cors({
  origin: allowAll ? true : env.corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
