"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const family_service_1 = require("./family.service");
const preference_service_1 = require("./preference.service");
class SchedulingService {
    /**
     * Generates a weekly carpool schedule for a given group.
     *
     * @param groupId The ID of the carpool group.
     * @param weekStartDate The starting date of the week for which to generate the schedule.
     * @returns The generated schedule as an array of assignments.
     */
    static async generateWeeklySchedule(groupId, weekStartDate) {
        // 1. Fetch all necessary data
        const families = await family_service_1.FamilyService.getFamiliesByGroup(groupId);
        const preferences = await preference_service_1.PreferenceService.getPreferencesForWeek(groupId, weekStartDate);
        const fairnessMetrics = await this.getFairnessMetrics(groupId);
        const assignments = [];
        const daysOfWeek = [0, 1, 2, 3, 4]; // Monday to Friday
        // 2. Iterate through each day of the week to create assignments
        for (const day of daysOfWeek) {
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(currentDate.getDate() + day);
            const familiesNeedingRide = families.filter((f) => {
                const pref = preferences.find((p) => p.familyId === f.id &&
                    new Date(p.date).getTime() === currentDate.getTime());
                return !pref || pref.canDrive === false;
            });
            const potentialDrivers = families.filter((f) => {
                const pref = preferences.find((p) => p.familyId === f.id &&
                    new Date(p.date).getTime() === currentDate.getTime());
                return pref && pref.canDrive === true;
            });
            // 3. Simple initial driver selection logic (to be enhanced with fairness)
            if (potentialDrivers.length > 0) {
                const driverFamily = this.selectBestDriver(potentialDrivers, fairnessMetrics);
                if (driverFamily) {
                    assignments.push({
                        familyId: driverFamily.id,
                        driverId: driverFamily.parentIds[0], // Assuming first parent drives for now
                        date: currentDate,
                        passengerFamilyIds: familiesNeedingRide.map((f) => f.id),
                    });
                    // Update fairness metrics conceptually
                    this.updateFairnessOnAssignment(fairnessMetrics, driverFamily.id, families.length);
                }
                else {
                    // Handle conflict: No driver found
                    console.warn(`No driver found for group ${groupId} on ${currentDate}`);
                }
            }
            else {
                // Handle conflict: No potential drivers
                console.warn(`No potential drivers for group ${groupId} on ${currentDate}`);
            }
        }
        // 4. TODO: Persist the generated assignments (e.g., as Trips)
        // await TripService.createTripsFromAssignments(assignments);
        return assignments;
    }
    /**
     * Selects the best driver from a list of potentials based on fairness metrics.
     * Families with a higher "fairness debt" (driven less than their fair share) are prioritized.
     */
    static selectBestDriver(potentialDrivers, fairnessMetrics) {
        if (potentialDrivers.length === 0)
            return null;
        // Sort drivers by their fairness debt, descending (highest debt first)
        potentialDrivers.sort((a, b) => {
            const debtA = fairnessMetrics[a.id] || 0;
            const debtB = fairnessMetrics[b.id] || 0;
            return debtB - debtA;
        });
        return potentialDrivers[0];
    }
    /**
     * Conceptually updates the fairness metrics after a driving assignment.
     */
    static updateFairnessOnAssignment(metrics, driverFamilyId, totalFamilies) {
        const fairShare = 1 / totalFamilies;
        for (const familyId in metrics) {
            if (familyId === driverFamilyId) {
                metrics[familyId] -= 1 - fairShare; // Driving credits their debt
            }
            else {
                metrics[familyId] += fairShare; // Not driving increases their debt
            }
        }
    }
    /**
     * TODO: Implement logic to fetch or calculate fairness metrics from a persistent store.
     */
    static async getFairnessMetrics(groupId) {
        // For now, returning a dummy object.
        // This should fetch historical driving data and calculate the debt.
        const families = await family_service_1.FamilyService.getFamiliesByGroup(groupId);
        const metrics = {};
        families.forEach((f) => {
            metrics[f.id] = 0; // Initialize all debts to 0
        });
        return metrics;
    }
}
exports.SchedulingService = SchedulingService;
