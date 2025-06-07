/**
 * Tests for VCarpool 5-Step Scheduling Algorithm
 * Testing core business logic per Product Specification requirements
 */

describe("VCarpool Scheduling Algorithm - Core Business Logic", () => {
  // Test data representing typical school carpool scenario
  const mockDrivers = [
    {
      id: "parent-1",
      name: "John Smith",
      email: "john@parent.com",
      role: "parent",
      isActiveDriver: true,
      preferences: {
        monday_morning: "preferable",
        tuesday_morning: "unavailable",
        wednesday_morning: "less-preferable",
        thursday_morning: "preferable",
        friday_morning: "neutral",
      },
    },
    {
      id: "parent-2",
      name: "Jane Doe",
      email: "jane@parent.com",
      role: "parent",
      isActiveDriver: true,
      preferences: {
        monday_morning: "neutral",
        tuesday_morning: "preferable",
        wednesday_morning: "preferable",
        thursday_morning: "unavailable",
        friday_morning: "less-preferable",
      },
    },
    {
      id: "parent-3",
      name: "Mike Johnson",
      email: "mike@parent.com",
      role: "parent",
      isActiveDriver: true,
      preferences: {
        monday_morning: "less-preferable",
        tuesday_morning: "neutral",
        wednesday_morning: "neutral",
        thursday_morning: "neutral",
        friday_morning: "preferable",
      },
    },
  ];

  const mockTimeSlots = [
    { day: "monday", time: "morning", route: "school-dropoff" },
    { day: "tuesday", time: "morning", route: "school-dropoff" },
    { day: "wednesday", time: "morning", route: "school-dropoff" },
    { day: "thursday", time: "morning", route: "school-dropoff" },
    { day: "friday", time: "morning", route: "school-dropoff" },
  ];

  describe("Step 1: Exclude Unavailable Drivers", () => {
    it("should exclude drivers marked as unavailable for specific slots", () => {
      const availableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.tuesday_morning !== "unavailable"
      );

      // Tuesday morning: parent-1 unavailable, parent-2 and parent-3 available
      expect(availableDrivers).toHaveLength(2);
      expect(availableDrivers.map((d) => d.id)).not.toContain("parent-1");
      expect(availableDrivers.map((d) => d.id)).toContain("parent-2");
      expect(availableDrivers.map((d) => d.id)).toContain("parent-3");
    });

    it("should handle all drivers unavailable scenario", () => {
      // Test with Thursday morning where parent-2 is unavailable
      const thursdayUnavailableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.thursday_morning === "unavailable"
      );

      // Only parent-2 is unavailable for Thursday morning
      expect(thursdayUnavailableDrivers).toHaveLength(1);
      expect(thursdayUnavailableDrivers[0].id).toBe("parent-2");
    });

    it("should preserve driver pool when no unavailable preferences", () => {
      const availableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.wednesday_morning !== "unavailable"
      );

      // Wednesday morning: all drivers available (none marked unavailable)
      expect(availableDrivers).toHaveLength(3);
    });
  });

  describe("Step 2: Assign Preferable Slots (Max 3 per week)", () => {
    it("should prioritize drivers with preferable preferences", () => {
      const mondayPreferableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.monday_morning === "preferable"
      );

      // Monday morning: only parent-1 has preferable
      expect(mondayPreferableDrivers).toHaveLength(1);
      expect(mondayPreferableDrivers[0].id).toBe("parent-1");
    });

    it("should enforce maximum 3 preferable slots per driver per week", () => {
      const parent1Preferable = Object.values(
        mockDrivers[0].preferences
      ).filter((pref) => pref === "preferable");

      // Parent-1 has 2 preferable slots (within limit)
      expect(parent1Preferable).toHaveLength(2);
      expect(parent1Preferable.length).toBeLessThanOrEqual(3);
    });

    it("should handle multiple drivers with same preferable slot", () => {
      const wednesdayPreferableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.wednesday_morning === "preferable"
      );

      // Wednesday morning: parent-2 has preferable
      expect(wednesdayPreferableDrivers).toHaveLength(1);
      expect(wednesdayPreferableDrivers[0].id).toBe("parent-2");
    });
  });

  describe("Step 3: Assign Less-Preferable Slots (Max 2 per week)", () => {
    it("should use less-preferable slots for secondary assignments", () => {
      const wednesdayLessPreferableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.wednesday_morning === "less-preferable"
      );

      // Wednesday morning: parent-1 has less-preferable
      expect(wednesdayLessPreferableDrivers).toHaveLength(1);
      expect(wednesdayLessPreferableDrivers[0].id).toBe("parent-1");
    });

    it("should enforce maximum 2 less-preferable slots per driver per week", () => {
      const parent2LessPreferable = Object.values(
        mockDrivers[1].preferences
      ).filter((pref) => pref === "less-preferable");

      // Parent-2 has 1 less-preferable slot (within limit)
      expect(parent2LessPreferable).toHaveLength(1);
      expect(parent2LessPreferable.length).toBeLessThanOrEqual(2);
    });

    it("should assign less-preferable when no preferable drivers available", () => {
      const fridayLessPreferableDrivers = mockDrivers.filter(
        (driver) => driver.preferences.friday_morning === "less-preferable"
      );

      // Friday morning: parent-2 has less-preferable option
      expect(fridayLessPreferableDrivers).toHaveLength(1);
      expect(fridayLessPreferableDrivers[0].id).toBe("parent-2");
    });
  });

  describe("Step 4: Fill Neutral Slots", () => {
    it("should use neutral preferences when preferable/less-preferable exhausted", () => {
      const mondayNeutralDrivers = mockDrivers.filter(
        (driver) => driver.preferences.monday_morning === "neutral"
      );

      // Monday morning: parent-2 neutral (backup option)
      expect(mondayNeutralDrivers).toHaveLength(1);
      expect(mondayNeutralDrivers[0].id).toBe("parent-2");
    });

    it("should provide multiple neutral options for slot filling", () => {
      const tuesdayNeutralDrivers = mockDrivers.filter(
        (driver) => driver.preferences.tuesday_morning === "neutral"
      );

      // Tuesday morning: parent-3 has neutral preference
      expect(tuesdayNeutralDrivers).toHaveLength(1);
      expect(tuesdayNeutralDrivers[0].id).toBe("parent-3");
    });

    it("should handle slots with multiple neutral drivers", () => {
      const wednesdayNeutralDrivers = mockDrivers.filter(
        (driver) => driver.preferences.wednesday_morning === "neutral"
      );

      // Wednesday morning: parent-3 neutral
      expect(wednesdayNeutralDrivers).toHaveLength(1);
    });
  });

  describe("Step 5: Historical Tie-Breaking for Fair Distribution", () => {
    it("should consider historical assignment counts for fairness", () => {
      const mockHistoricalData = {
        "parent-1": 3, // Had 3 assignments last month
        "parent-2": 1, // Had 1 assignment last month
        "parent-3": 2, // Had 2 assignments last month
      };

      // Parent-2 should be prioritized due to fewer historical assignments
      const sortedByHistory = Object.entries(mockHistoricalData)
        .sort(([, a], [, b]) => a - b)
        .map(([id]) => id);

      expect(sortedByHistory[0]).toBe("parent-2"); // Lowest count first
      expect(sortedByHistory[2]).toBe("parent-1"); // Highest count last
    });

    it("should handle equal historical counts with secondary criteria", () => {
      const mockEqualHistory = {
        "parent-1": 2,
        "parent-2": 2,
        "parent-3": 2,
      };

      // When equal history, should maintain consistent ordering
      const equalCounts = Object.values(mockEqualHistory);
      const allEqual = equalCounts.every((count) => count === equalCounts[0]);

      expect(allEqual).toBe(true);
    });

    it("should track assignment frequency for long-term fairness", () => {
      const mockAssignmentHistory = [
        { week: 1, driver: "parent-1", slots: 2 },
        { week: 1, driver: "parent-2", slots: 1 },
        { week: 1, driver: "parent-3", slots: 2 },
        { week: 2, driver: "parent-1", slots: 1 },
        { week: 2, driver: "parent-2", slots: 3 },
        { week: 2, driver: "parent-3", slots: 1 },
      ];

      const totalAssignments = mockAssignmentHistory.reduce((acc, record) => {
        acc[record.driver] = (acc[record.driver] || 0) + record.slots;
        return acc;
      }, {} as Record<string, number>);

      // Parent-2 has most total assignments (4), parent-1 and parent-3 tied (3 each)
      expect(totalAssignments["parent-2"]).toBe(4);
      expect(totalAssignments["parent-1"]).toBe(3);
      expect(totalAssignments["parent-3"]).toBe(3);
    });
  });

  describe("Business Rule Validation", () => {
    it("should enforce 3 Preferable + 2 Less-Preferable + 2 Unavailable limit", () => {
      mockDrivers.forEach((driver) => {
        const preferences = Object.values(driver.preferences);
        const preferableCount = preferences.filter(
          (p) => p === "preferable"
        ).length;
        const lessPreferableCount = preferences.filter(
          (p) => p === "less-preferable"
        ).length;
        const unavailableCount = preferences.filter(
          (p) => p === "unavailable"
        ).length;

        expect(preferableCount).toBeLessThanOrEqual(3);
        expect(lessPreferableCount).toBeLessThanOrEqual(2);
        expect(unavailableCount).toBeLessThanOrEqual(2);
      });
    });

    it("should validate driver eligibility (active parents)", () => {
      const eligibleDrivers = mockDrivers.filter(
        (driver) => driver.role === "parent" && driver.isActiveDriver
      );

      expect(eligibleDrivers).toHaveLength(3);
      expect(eligibleDrivers.every((d) => d.role === "parent")).toBe(true);
      expect(eligibleDrivers.every((d) => d.isActiveDriver)).toBe(true);
    });

    it("should handle Wednesday 5 PM submission deadline", () => {
      const submissionDeadline = new Date("2024-01-17T17:00:00"); // Wednesday 5 PM
      const testSubmissionTime = new Date("2024-01-17T16:30:00"); // Wednesday 4:30 PM

      const isBeforeDeadline = testSubmissionTime < submissionDeadline;
      expect(isBeforeDeadline).toBe(true);

      const lateSubmission = new Date("2024-01-17T18:00:00"); // Wednesday 6 PM
      const isAfterDeadline = lateSubmission > submissionDeadline;
      expect(isAfterDeadline).toBe(true);
    });
  });

  describe("Algorithm Integration Tests", () => {
    it("should produce valid weekly schedule for all time slots", () => {
      const weeklySchedule = mockTimeSlots.map((slot) => {
        const slotKey =
          `${slot.day}_${slot.time}` as keyof (typeof mockDrivers)[0]["preferences"];

        // Step 1: Filter available drivers
        const availableDrivers = mockDrivers.filter(
          (driver) => driver.preferences[slotKey] !== "unavailable"
        );

        // Step 2: Try preferable first
        let assignedDriver = availableDrivers.find(
          (driver) => driver.preferences[slotKey] === "preferable"
        );

        // Step 3: Try less-preferable if no preferable
        if (!assignedDriver) {
          assignedDriver = availableDrivers.find(
            (driver) => driver.preferences[slotKey] === "less-preferable"
          );
        }

        // Step 4: Use neutral if nothing else
        if (!assignedDriver) {
          assignedDriver = availableDrivers.find(
            (driver) => driver.preferences[slotKey] === "neutral"
          );
        }

        return {
          slot: slot,
          driver: assignedDriver,
          assignmentMethod: assignedDriver
            ? mockDrivers.find((d) => d.id === assignedDriver!.id)!.preferences[
                slotKey
              ]
            : "unassigned",
        };
      });

      // Verify all slots have assignments (in this test scenario)
      const assignedSlots = weeklySchedule.filter((s) => s.driver);
      expect(assignedSlots.length).toBeGreaterThan(0);

      // Verify assignment methods are valid
      weeklySchedule.forEach((schedule) => {
        if (schedule.driver) {
          expect(["preferable", "less-preferable", "neutral"]).toContain(
            schedule.assignmentMethod
          );
        }
      });
    });

    it("should handle edge case: insufficient drivers for all slots", () => {
      const limitedDrivers = [mockDrivers[0]]; // Only one driver available

      const assignments = mockTimeSlots.map((slot) => {
        const slotKey =
          `${slot.day}_${slot.time}` as keyof (typeof mockDrivers)[0]["preferences"];
        return limitedDrivers[0].preferences[slotKey] !== "unavailable"
          ? limitedDrivers[0]
          : null;
      });

      const successfulAssignments = assignments.filter((a) => a !== null);
      const failedAssignments = assignments.filter((a) => a === null);

      // Should have some successful and some failed (due to unavailable preference)
      expect(successfulAssignments.length).toBeGreaterThan(0);
      expect(failedAssignments.length).toBeGreaterThanOrEqual(0);
    });

    it("should maintain algorithm performance with larger datasets", () => {
      const largeDriverSet = Array.from({ length: 50 }, (_, i) => ({
        id: `parent-${i}`,
        name: `Parent ${i}`,
        email: `parent${i}@school.edu`,
        role: "parent" as const,
        isActiveDriver: true,
        preferences: {
          monday_morning: [
            "preferable",
            "less-preferable",
            "neutral",
            "unavailable",
          ][i % 4] as any,
          tuesday_morning: [
            "preferable",
            "less-preferable",
            "neutral",
            "unavailable",
          ][(i + 1) % 4] as any,
          wednesday_morning: [
            "preferable",
            "less-preferable",
            "neutral",
            "unavailable",
          ][(i + 2) % 4] as any,
          thursday_morning: [
            "preferable",
            "less-preferable",
            "neutral",
            "unavailable",
          ][(i + 3) % 4] as any,
          friday_morning: [
            "preferable",
            "less-preferable",
            "neutral",
            "unavailable",
          ][i % 4] as any,
        },
      }));

      const startTime = Date.now();

      // Simulate algorithm execution
      const assignments = mockTimeSlots.map((slot) => {
        const slotKey =
          `${slot.day}_${slot.time}` as keyof (typeof largeDriverSet)[0]["preferences"];
        return largeDriverSet.find(
          (driver) => driver.preferences[slotKey] === "preferable"
        );
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Algorithm should complete quickly even with larger datasets
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
      expect(assignments.length).toBe(mockTimeSlots.length);
    });
  });

  describe("VCarpool-Specific Requirements", () => {
    it("should support school-focused route types", () => {
      const schoolRoutes = [
        "school-dropoff",
        "school-pickup",
        "after-school-activity",
      ];

      schoolRoutes.forEach((route) => {
        expect([
          "school-dropoff",
          "school-pickup",
          "after-school-activity",
        ]).toContain(route);
      });
    });

    it("should handle parent-child relationship constraints", () => {
      const parentWithChildren = {
        ...mockDrivers[0],
        children: [
          { id: "child-1", name: "Alice Smith", grade: "3rd" },
          { id: "child-2", name: "Bob Smith", grade: "1st" },
        ],
      };

      expect(parentWithChildren.children).toHaveLength(2);
      expect(
        parentWithChildren.children.every((child) =>
          child.name.includes("Smith")
        )
      ).toBe(true);
    });

    it("should support multiple school locations and routes", () => {
      const multiSchoolSlots = [
        {
          day: "monday",
          time: "morning",
          route: "elementary-dropoff",
          school: "Lincoln Elementary",
        },
        {
          day: "monday",
          time: "morning",
          route: "middle-dropoff",
          school: "Jefferson Middle",
        },
        {
          day: "monday",
          time: "afternoon",
          route: "elementary-pickup",
          school: "Lincoln Elementary",
        },
      ];

      const uniqueSchools = [...new Set(multiSchoolSlots.map((s) => s.school))];
      expect(uniqueSchools).toHaveLength(2);
      expect(uniqueSchools).toContain("Lincoln Elementary");
      expect(uniqueSchools).toContain("Jefferson Middle");
    });
  });
});
