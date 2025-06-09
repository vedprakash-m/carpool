"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.tripQuerySchema = exports.updateTripSchema = exports.createTripSchema = exports.updateUserSchema = exports.loginSchema = exports.registerSchema = exports.parentSchema = exports.childSchema = void 0;
const zod_1 = require("zod");
// Keep this in sync with frontend/src/types/shared.ts
exports.childSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    grade: zod_1.z.string().min(1, "Grade is required"),
    school: zod_1.z.string().min(1, "School is required"),
});
exports.parentSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
exports.registerSchema = zod_1.z.object({
    familyName: zod_1.z.string().min(1, "Family name is required"),
    parent: exports.parentSchema,
    secondParent: exports.parentSchema.optional(),
    children: zod_1.z.array(exports.childSchema).min(1, "At least one child is required"),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    // For school carpool
    isActiveDriver: zod_1.z.boolean().optional(),
    homeAddress: zod_1.z.string().optional(),
});
exports.createTripSchema = zod_1.z.object({
    date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD"),
    departureTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM"),
    arrivalTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM"),
    destination: zod_1.z.string().min(1, "Destination is required"),
    maxPassengers: zod_1.z.number().int().min(1, "Max passengers must be at least 1"),
    cost: zod_1.z.number().optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateTripSchema = zod_1.z.object({
    date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD")
        .optional(),
    departureTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM")
        .optional(),
    arrivalTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM")
        .optional(),
    destination: zod_1.z.string().min(1, "Destination is required").optional(),
    maxPassengers: zod_1.z
        .number()
        .int()
        .min(1, "Max passengers must be at least 1")
        .optional(),
    cost: zod_1.z.number().optional(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(["planned", "active", "completed", "cancelled"]).optional(),
});
exports.tripQuerySchema = zod_1.z.object({
    destination: zod_1.z.string().optional(),
    date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD")
        .optional(),
    availableSeats: zod_1.z.coerce.number().int().min(1).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(10),
});
// Forgot password: expects { email: string }
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
});
// Reset password: expects { token: string, newPassword: string }
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(8, "Invalid or missing reset token"),
    newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
// Change password: expects { oldPassword: string, newPassword: string }
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(8, "Old password is required"),
    newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
//# sourceMappingURL=validations.js.map