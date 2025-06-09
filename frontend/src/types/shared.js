"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = exports.childSchema = exports.loginSchema = exports.joinTripSchema = exports.updateTripSchema = exports.createTripSchema = exports.createUserSchema = exports.updateUserSchema = void 0;
// Local copy of shared types for deployment compatibility
const zod_1 = require("zod");
// Validation schemas
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    grade: zod_1.z.string().optional(),
    emergencyContact: zod_1.z.string().optional(),
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    phoneNumber: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
});
exports.createTripSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, "Date is required"),
    departureTime: zod_1.z.string().min(1, "Departure time is required"),
    arrivalTime: zod_1.z.string().min(1, "Arrival time is required"),
    destination: zod_1.z.string().min(1, "Destination is required"),
    maxPassengers: zod_1.z.number().min(1).max(8),
    cost: zod_1.z.number().min(0).optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateTripSchema = zod_1.z.object({
    date: zod_1.z.string().min(1).optional(),
    departureTime: zod_1.z.string().optional(),
    arrivalTime: zod_1.z.string().optional(),
    destination: zod_1.z.string().min(1).optional(),
    maxPassengers: zod_1.z.number().min(1).max(8).optional(),
    cost: zod_1.z.number().min(0).optional(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(["planned", "active", "completed", "cancelled"]).optional(),
});
exports.joinTripSchema = zod_1.z.object({
    pickupLocation: zod_1.z.string().min(1, "Pickup location is required"),
});
// Auth validation schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.childSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, "Child's first name is required"),
    lastName: zod_1.z.string().min(1, "Child's last name is required"),
    grade: zod_1.z.string().min(1, "Child's grade is required"),
    school: zod_1.z.string().min(1, "Child's school is required"),
});
// Keep this in sync with backend/srcs/validations.ts
// The actual Zod schema is defined in the backend package.
// This is just for type inference on the frontend.
const validations_1 = require("@vcarpool/shared/src/validations");
exports.registerSchema = validations_1.registerSchema;
