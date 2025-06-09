"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesQuerySchema = exports.sendMessageSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Message content cannot be empty"),
    type: zod_1.z.nativeEnum(types_1.MessageType),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.messagesQuerySchema = zod_1.z.object({
    chatId: zod_1.z.string().uuid("Invalid chat ID format"),
    before: zod_1.z.string().datetime().optional(),
    after: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
});
//# sourceMappingURL=message-schemas.js.map