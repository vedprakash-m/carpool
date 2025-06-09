"use strict";
// backend/src/services/preference.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferenceService = void 0;
class PreferenceService {
    static preferences = [
    // Mock data
    ];
    static async getPreferencesForWeek(groupId, weekStartDate) {
        console.log(`Fetching preferences for group ${groupId} for week of ${weekStartDate.toDateString()}...`);
        // In a real implementation, you would filter preferences by group and week
        return this.preferences;
    }
}
exports.PreferenceService = PreferenceService;
