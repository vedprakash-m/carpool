"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = void 0;
const hasRole = (allowedRoles) => {
    return (request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context) => {
        const user = request.auth;
        if (!user || !user.role) {
            return Promise.resolve({
                status: 401,
                jsonBody: { success: false, error: "Unauthorized" },
            });
        }
        if (!allowedRoles.includes(user.role)) {
            return Promise.resolve({
                status: 403,
                jsonBody: { success: false, error: "Forbidden" },
            });
        }
        // If the user has the required role, continue to the next middleware
        return Promise.resolve();
    };
};
exports.hasRole = hasRole;
