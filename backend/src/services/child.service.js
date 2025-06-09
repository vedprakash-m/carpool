"use strict";
// backend/src/services/child.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildService = void 0;
class ChildService {
    static children = [
    // Mock data
    ];
    static async createChild(childData, familyId, parentId) {
        const newChild = {
            id: `child-${Date.now()}`,
            familyId,
            parentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...childData,
        };
        this.children.push(newChild);
        return newChild;
    }
    async createChild(childData, familyId, parentId) {
        const newChild = {
            id: `child-${Date.now()}`,
            familyId,
            parentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...childData,
        };
        ChildService.children.push(newChild);
        return newChild;
    }
}
exports.ChildService = ChildService;
