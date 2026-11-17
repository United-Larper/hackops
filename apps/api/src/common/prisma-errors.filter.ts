import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "../generated/prisma/client";

/** Turns Prisma's "record not found" and "bad reference" errors into 404 and 400 instead of 500. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaErrorsFilter implements ExceptionFilter {
  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (err.code === "P2025") return res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: "Not found" });
    if (err.code === "P2003") return res.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, message: "A linked record does not exist" });
    if (err.code === "P2002") return res.status(HttpStatus.CONFLICT).json({ statusCode: 409, message: "Already exists" });
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: "Database error" });
  }
}
