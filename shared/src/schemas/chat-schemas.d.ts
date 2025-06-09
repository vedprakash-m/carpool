import { z } from "zod";
export declare const createChatSchema: z.ZodObject<{
    tripId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tripId: string;
    name?: string | undefined;
    description?: string | undefined;
}, {
    tripId: string;
    name?: string | undefined;
    description?: string | undefined;
}>;
export declare const chatsQuerySchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    tripId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    includeInactive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    includeInactive: boolean;
    userId?: string | undefined;
    tripId?: string | undefined;
}, {
    userId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    tripId?: string | undefined;
    includeInactive?: boolean | undefined;
}>;
