import { z } from "zod";

// Keep this in sync with frontend/src/types/shared.ts

export const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  grade: z.string().min(1, "Grade is required"),
  school: z.string().min(1, "School is required"),
});

export const parentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  parent: parentSchema,
  secondParent: parentSchema.optional(),
  children: z.array(childSchema).min(1, "At least one child is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // For school carpool
  isActiveDriver: z.boolean().optional(),
  homeAddress: z.string().optional(),
});
