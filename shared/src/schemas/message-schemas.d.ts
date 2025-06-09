import { z } from "zod";
import { MessageType } from "../types";
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    type: z.ZodNativeEnum<typeof MessageType>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: MessageType;
    content: string;
    metadata?: Record<string, any> | undefined;
}, {
    type: MessageType;
    content: string;
    metadata?: Record<string, any> | undefined;
}>;
export declare const messagesQuerySchema: z.ZodObject<{
    chatId: z.ZodString;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    chatId: string;
    before?: string | undefined;
    after?: string | undefined;
}, {
    chatId: string;
    limit?: number | undefined;
    page?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
}>;
