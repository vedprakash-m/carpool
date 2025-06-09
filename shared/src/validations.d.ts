import { z } from "zod";
export declare const childSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    grade: z.ZodString;
    school: z.ZodString;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
}, {
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
}>;
export declare const parentSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
    firstName: string;
    lastName: string;
}, {
    password: string;
    email: string;
    firstName: string;
    lastName: string;
}>;
export declare const registerSchema: z.ZodObject<{
    familyName: z.ZodString;
    parent: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }, {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }>;
    secondParent: z.ZodOptional<z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }, {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }>>;
    children: z.ZodArray<z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        grade: z.ZodString;
        school: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        grade: string;
        school: string;
    }, {
        firstName: string;
        lastName: string;
        grade: string;
        school: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    parent: {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    children: {
        firstName: string;
        lastName: string;
        grade: string;
        school: string;
    }[];
    familyName: string;
    secondParent?: {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    } | undefined;
}, {
    parent: {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    children: {
        firstName: string;
        lastName: string;
        grade: string;
        school: string;
    }[];
    familyName: string;
    secondParent?: {
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    } | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export declare const updateUserSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    isActiveDriver: z.ZodOptional<z.ZodBoolean>;
    homeAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    isActiveDriver?: boolean | undefined;
    homeAddress?: string | undefined;
}, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    isActiveDriver?: boolean | undefined;
    homeAddress?: string | undefined;
}>;
export declare const createTripSchema: z.ZodObject<{
    date: z.ZodString;
    departureTime: z.ZodString;
    arrivalTime: z.ZodString;
    destination: z.ZodString;
    maxPassengers: z.ZodNumber;
    cost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    maxPassengers: number;
    departureTime: string;
    destination: string;
    date: string;
    arrivalTime: string;
    cost?: number | undefined;
    notes?: string | undefined;
}, {
    maxPassengers: number;
    departureTime: string;
    destination: string;
    date: string;
    arrivalTime: string;
    cost?: number | undefined;
    notes?: string | undefined;
}>;
export declare const updateTripSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    departureTime: z.ZodOptional<z.ZodString>;
    arrivalTime: z.ZodOptional<z.ZodString>;
    destination: z.ZodOptional<z.ZodString>;
    maxPassengers: z.ZodOptional<z.ZodNumber>;
    cost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    maxPassengers?: number | undefined;
    departureTime?: string | undefined;
    destination?: string | undefined;
    date?: string | undefined;
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    cost?: number | undefined;
    arrivalTime?: string | undefined;
    notes?: string | undefined;
}, {
    maxPassengers?: number | undefined;
    departureTime?: string | undefined;
    destination?: string | undefined;
    date?: string | undefined;
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    cost?: number | undefined;
    arrivalTime?: string | undefined;
    notes?: string | undefined;
}>;
export declare const tripQuerySchema: z.ZodObject<{
    destination: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    availableSeats: z.ZodOptional<z.ZodNumber>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    destination?: string | undefined;
    date?: string | undefined;
    availableSeats?: number | undefined;
}, {
    destination?: string | undefined;
    date?: string | undefined;
    availableSeats?: number | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    oldPassword: string;
}, {
    newPassword: string;
    oldPassword: string;
}>;
