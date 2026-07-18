import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * Normalizes every thrown error into the error envelope frozen in
 * docs/architecture/API_CONTRACT.md section 3, so Week 2+ handlers inherit
 * one shape instead of NestJS's default {statusCode, message, error}.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationId = randomUUID();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null;

    const code = isRecord(body) && typeof body.code === "string" ? body.code : "INTERNAL_ERROR";
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : exception instanceof Error
          ? exception.message
          : "Unexpected error.";
    const details = isRecord(body) && Array.isArray(body.details) ? body.details : undefined;

    response.status(status).json({
      error: {
        code,
        message,
        status,
        correlationId,
        ...(details ? { details } : {}),
        retryable: status === HttpStatus.SERVICE_UNAVAILABLE,
      },
    });
  }
}
