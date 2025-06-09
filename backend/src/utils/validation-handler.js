"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidation = handleValidation;
exports.validateSafely = validateSafely;
const zod_1 = require("zod");
const error_handler_1 = require("./error-handler");
/**
 * Validates input data against a Zod schema
 * Throws validation error if data is invalid
 */
function handleValidation(schema, data) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const messages = error.errors.map((err) => {
                const path = err.path.join(".");
                return path ? `${path}: ${err.message}` : err.message;
            });
            throw error_handler_1.Errors.BadRequest(`Validation failed: ${messages.join(", ")}`);
        }
        throw error;
    }
}
/**
 * Validates input data and returns result with success flag
 * Does not throw errors, useful for optional validation
 */
function validateSafely(schema, data) {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errors = error.errors.map((err) => {
                const path = err.path.join(".");
                return path ? `${path}: ${err.message}` : err.message;
            });
            return { success: false, errors };
        }
        return { success: false, errors: ["Unknown validation error"] };
    }
}
