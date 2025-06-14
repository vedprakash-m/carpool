/**
 * Enhanced Error Handling Middleware
 * Phase 1: Foundation Strengthening - Error Handling
 *
 * Provides comprehensive error handling with:
 * - Structured error responses
 * - Error classification and severity
 * - Performance impact tracking
 * - Security-aware error messages
 */

import { Context, HttpRequest, HttpResponseInit } from "@azure/functions";
import { MonitoringService } from "../services/monitoring.service";
import { PerformanceOptimizer } from "../services/performance-optimizer";

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  NOT_FOUND = "not_found",
  BUSINESS_LOGIC = "business_logic",
  EXTERNAL_SERVICE = "external_service",
  DATABASE = "database",
  SYSTEM = "system",
  RATE_LIMIT = "rate_limit",
  TIMEOUT = "timeout",
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  userMessage?: string;
  details?: any;
  retryable?: boolean;
  timestamp: string;
  correlationId?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly userMessage?: string;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    userMessage?: string,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();

    // Ensure the name of this error is the same as the class name
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private monitor: MonitoringService;
  private optimizer: PerformanceOptimizer;

  constructor() {
    this.monitor = MonitoringService.getInstance();
    this.optimizer = PerformanceOptimizer.getInstance();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and format errors for HTTP responses
   */
  handleError(context: Context, error: Error | AppError): HttpResponseInit {
    const correlationId = this.monitor.getCorrelationId();

    // Convert to AppError if not already
    const appError = this.normalizeError(error);
    appError.correlationId = correlationId;

    // Log the error with appropriate level
    this.logError(context, appError);

    // Track error metrics
    this.trackErrorMetrics(appError);

    // Create user-safe response
    const response = this.createErrorResponse(appError);

    return this.optimizer.createOptimizedResponse(
      response,
      appError.statusCode
    );
  }

  /**
   * Convert any error to AppError
   */
  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific error types
    if (error.name === "ValidationError") {
      return new AppError(
        error.message,
        "VALIDATION_FAILED",
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        400,
        "Please check your input and try again.",
        undefined,
        false
      );
    }

    if (
      error.name === "UnauthorizedError" ||
      error.message.includes("unauthorized")
    ) {
      return new AppError(
        "Authentication failed",
        "AUTH_FAILED",
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        401,
        "Please log in and try again.",
        undefined,
        false
      );
    }

    if (
      error.name === "ForbiddenError" ||
      error.message.includes("forbidden")
    ) {
      return new AppError(
        "Access denied",
        "ACCESS_DENIED",
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.MEDIUM,
        403,
        "You do not have permission to perform this action.",
        undefined,
        false
      );
    }

    if (error.name === "NotFoundError" || error.message.includes("not found")) {
      return new AppError(
        error.message,
        "RESOURCE_NOT_FOUND",
        ErrorCategory.NOT_FOUND,
        ErrorSeverity.LOW,
        404,
        "The requested resource was not found.",
        undefined,
        false
      );
    }

    if (error.name === "TimeoutError" || error.message.includes("timeout")) {
      return new AppError(
        "Operation timed out",
        "TIMEOUT",
        ErrorCategory.TIMEOUT,
        ErrorSeverity.MEDIUM,
        408,
        "The operation took too long to complete. Please try again.",
        undefined,
        true
      );
    }

    if (
      error.message.includes("database") ||
      error.message.includes("cosmos")
    ) {
      return new AppError(
        "Database operation failed",
        "DATABASE_ERROR",
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        500,
        "A temporary issue occurred. Please try again.",
        undefined,
        true
      );
    }

    // Default system error
    return new AppError(
      "An unexpected error occurred",
      "SYSTEM_ERROR",
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      500,
      "An unexpected error occurred. Please try again.",
      {
        originalMessage: error.message,
        originalName: error.name,
      },
      false
    );
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(context: Context, error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      functionName: context.executionContext.functionName,
      invocationId: context.executionContext.invocationId,
      errorCode: error.code,
      errorCategory: error.category,
      errorSeverity: error.severity,
      statusCode: error.statusCode,
      retryable: error.retryable,
      details: error.details,
    };

    this.monitor.log(
      logLevel,
      `Error occurred: ${error.message}`,
      logData,
      error
    );
  }

  /**
   * Track error metrics for monitoring
   */
  private trackErrorMetrics(error: AppError): void {
    this.monitor.trackEvent("Error.Occurred", {
      code: error.code,
      category: error.category,
      severity: error.severity,
      statusCode: error.statusCode.toString(),
      retryable: error.retryable.toString(),
    });

    // Track specific metrics
    this.monitor.trackMetric(`Error.Count.${error.category}`, 1, {
      severity: error.severity,
      code: error.code,
    });

    this.monitor.trackMetric("Error.Count.Total", 1);

    // Alert on high severity errors
    if (
      error.severity === ErrorSeverity.CRITICAL ||
      error.severity === ErrorSeverity.HIGH
    ) {
      this.monitor.trackEvent("Error.HighSeverity", {
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
      });
    }
  }

  /**
   * Create user-safe error response
   */
  private createErrorResponse(error: AppError): any {
    const isProduction = process.env.NODE_ENV === "production";

    const response: any = {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage || error.message,
        category: error.category,
        retryable: error.retryable,
        timestamp: error.timestamp,
      },
    };

    // Add correlation ID for tracking
    if (error.correlationId) {
      response.correlationId = error.correlationId;
    }

    // Add technical details in non-production environments
    if (!isProduction) {
      response.error.details = {
        technicalMessage: error.message,
        details: error.details,
        severity: error.severity,
      };
    }

    // Add retry guidance for retryable errors
    if (error.retryable) {
      response.error.retryAfter = this.getRetryDelay(error.category);
      response.error.maxRetries = this.getMaxRetries(error.category);
    }

    return response;
  }

  /**
   * Get appropriate log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): "info" | "warn" | "error" {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "info";
      case ErrorSeverity.MEDIUM:
        return "warn";
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return "error";
      default:
        return "warn";
    }
  }

  /**
   * Get retry delay for different error categories
   */
  private getRetryDelay(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return 60000; // 1 minute
      case ErrorCategory.EXTERNAL_SERVICE:
        return 30000; // 30 seconds
      case ErrorCategory.DATABASE:
        return 10000; // 10 seconds
      case ErrorCategory.TIMEOUT:
        return 5000; // 5 seconds
      default:
        return 5000; // 5 seconds
    }
  }

  /**
   * Get max retries for different error categories
   */
  private getMaxRetries(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return 3;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 3;
      case ErrorCategory.DATABASE:
        return 2;
      case ErrorCategory.TIMEOUT:
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Middleware decorator for automatic error handling
   */
  static middleware() {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) => {
      const method = descriptor.value;
      const errorHandler = ErrorHandler.getInstance();

      descriptor.value = async function (context: Context, req: HttpRequest) {
        try {
          return await method.apply(this, [context, req]);
        } catch (error) {
          return errorHandler.handleError(context, error);
        }
      };

      return descriptor;
    };
  }
}

// Predefined error factory functions
export const createValidationError = (message: string, details?: any) =>
  new AppError(
    message,
    "VALIDATION_FAILED",
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    400,
    "Please check your input and try again.",
    details
  );

export const createAuthenticationError = (
  message: string = "Authentication failed"
) =>
  new AppError(
    message,
    "AUTH_FAILED",
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.MEDIUM,
    401,
    "Please log in and try again."
  );

export const createAuthorizationError = (message: string = "Access denied") =>
  new AppError(
    message,
    "ACCESS_DENIED",
    ErrorCategory.AUTHORIZATION,
    ErrorSeverity.MEDIUM,
    403,
    "You do not have permission to perform this action."
  );

export const createNotFoundError = (resource: string) =>
  new AppError(
    `${resource} not found`,
    "RESOURCE_NOT_FOUND",
    ErrorCategory.NOT_FOUND,
    ErrorSeverity.LOW,
    404,
    "The requested resource was not found."
  );

export const createBusinessLogicError = (
  message: string,
  code: string,
  details?: any
) =>
  new AppError(
    message,
    code,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    400,
    message,
    details
  );

export const createExternalServiceError = (service: string, details?: any) =>
  new AppError(
    `${service} service is unavailable`,
    "EXTERNAL_SERVICE_ERROR",
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorSeverity.HIGH,
    503,
    "A required service is temporarily unavailable. Please try again.",
    details,
    true
  );

export const createDatabaseError = (operation: string, details?: any) =>
  new AppError(
    `Database ${operation} failed`,
    "DATABASE_ERROR",
    ErrorCategory.DATABASE,
    ErrorSeverity.HIGH,
    500,
    "A temporary issue occurred. Please try again.",
    details,
    true
  );

export const createRateLimitError = (limit: number, windowMs: number) =>
  new AppError(
    "Rate limit exceeded",
    "RATE_LIMIT_EXCEEDED",
    ErrorCategory.RATE_LIMIT,
    ErrorSeverity.MEDIUM,
    429,
    "Too many requests. Please wait and try again.",
    { limit, windowMs },
    true
  );

export { ErrorHandler };
