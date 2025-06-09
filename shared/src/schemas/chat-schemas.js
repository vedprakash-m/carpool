"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsQuerySchema = exports.createChatSchema = void 0;
const zod_1 = require("zod");
exports.createChatSchema = zod_1.z.object({
    tripId: zod_1.z.string().uuid("Invalid trip ID format"),
    name: zod_1.z.string().min(1, "Chat name is required").optional(),
    description: zod_1.z.string().optional(),
});
exports.chatsQuerySchema = zod_1.z.object({
    userId: zod_1.z.string().uuid("Invalid user ID format").optional(),
    tripId: zod_1.z.string().uuid("Invalid trip ID format").optional(),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(10),
    includeInactive: zod_1.z.coerce.boolean().optional().default(false),
});
//# sourceMappingURL=chat-schemas.js.map