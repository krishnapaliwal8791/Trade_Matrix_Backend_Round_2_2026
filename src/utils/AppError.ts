export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly reason?: string;
  public readonly suggestedFix?: string;

  constructor(
    message: string, 
    statusCode: number, 
    code: string, 
    isOperational = true,
    reason?: string,
    suggestedFix?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.reason = reason;
    this.suggestedFix = suggestedFix;

    Error.captureStackTrace(this, this.constructor);
  }
}
