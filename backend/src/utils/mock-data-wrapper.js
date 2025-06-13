/**
 * JavaScript wrapper for the TypeScript MockDataFactory
 * Provides compatibility for legacy JavaScript Azure Functions
 * This is a bridge during the migration to full TypeScript
 */

// For now, we'll recreate the essential factory functions in JavaScript
// Later, this will import from the compiled TypeScript MockDataFactory

/**
 * Centralized Mock Data Factory - JavaScript Version
 * Single source of truth for all test and development mock data
 * Eliminates duplication across 25+ backend functions
 */

class MockDataFactory {
  // Standard user generators
  static USERS = {
    admin: (overrides = {}) => ({
      id: "admin-123",
      email: "admin@vcarpool.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      phoneNumber: "555-0100",
      homeAddress: "100 Admin Street, Tesla City, TX 78701",
      isActiveDriver: false,
      hashedPassword: "$2b$10$hashedAdminPassword",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }),

    parent: (overrides = {}) => ({
      id: "parent-1",
      email: "parent@tesla.edu",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "parent",
      phoneNumber: "555-0123",
      homeAddress: "123 Maple Street, Tesla City, TX 78701",
      isActiveDriver: true,
      hashedPassword: "$2b$10$hashedParentPassword",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }),

    student: (overrides = {}) => ({
      id: "student-1",
      email: "student@tesla.edu",
      firstName: "Emma",
      lastName: "Wilson",
      role: "student",
      phoneNumber: "555-0126",
      homeAddress: "456 Oak Avenue, Tesla City, TX 78701",
      isActiveDriver: false,
      hashedPassword: "$2b$10$hashedStudentPassword",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }),

    tripAdmin: (overrides = {}) => ({
      id: "trip-admin-1",
      email: "tripadmin@tesla.edu",
      firstName: "Michael",
      lastName: "Chen",
      role: "trip_admin",
      phoneNumber: "555-0124",
      homeAddress: "789 Pine Road, Tesla City, TX 78701",
      isActiveDriver: true,
      hashedPassword: "$2b$10$hashedTripAdminPassword",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }),
  };

  // Standard school configurations
  static SCHOOLS = {
    tesla: () => ({
      id: "school-tesla",
      name: "Tesla STEM High School",
      address: "1 Tesla Drive, Tesla City, TX 78701",
      location: { lat: 30.2672, lng: -97.7431 },
      district: "Tesla Independent School District",
      type: "high",
      grades: ["9th", "10th", "11th", "12th"],
      contactInfo: {
        phone: "512-555-0200",
        email: "info@tesla.edu",
        website: "https://tesla.edu",
      },
      isActive: true,
    }),

    lincoln: () => ({
      id: "school-lincoln",
      name: "Lincoln Elementary",
      address: "456 Lincoln Ave, Tesla City, TX 78702",
      location: { lat: 30.2875, lng: -97.7394 },
      district: "Tesla Independent School District",
      type: "elementary",
      grades: ["K", "1st", "2nd", "3rd", "4th", "5th"],
      contactInfo: {
        phone: "512-555-0201",
        email: "info@lincoln.edu",
        website: "https://lincoln.edu",
      },
      isActive: true,
    }),

    mainElementary: () => ({
      id: "school-main",
      name: "Main Elementary",
      address: "789 Main St, Tesla City, TX 78703",
      location: { lat: 30.2543, lng: -97.7503 },
      district: "Tesla Independent School District",
      type: "elementary",
      grades: ["K", "1st", "2nd", "3rd", "4th", "5th"],
      contactInfo: {
        phone: "512-555-0202",
        email: "info@main.edu",
        website: "https://main.edu",
      },
      isActive: true,
    }),
  };

  // Create a trip with configurable overrides
  static createTrip(overrides = {}) {
    const defaultTrip = {
      id: "trip-1",
      driverId: "parent-1",
      driverName: "Sarah Johnson",
      driverContact: {
        email: "parent@tesla.edu",
        phoneNumber: "555-0123",
      },
      passengerIds: ["student-1", "student-2"],
      passengers: [
        {
          id: "student-1",
          name: "Emma Wilson",
          phoneNumber: "555-0126",
        },
        {
          id: "student-2",
          name: "Lucas Chen",
          phoneNumber: "555-0124",
        },
      ],
      pickupLocation: "123 Maple Street, Tesla City, TX 78701",
      dropoffLocation: "Tesla STEM High School",
      scheduledPickupTime: "07:30",
      scheduledDropoffTime: "08:00",
      date: new Date().toISOString().split("T")[0],
      status: "confirmed",
      routeType: "school_dropoff",
      estimatedDuration: 30,
      actualPickupTime: null,
      actualDropoffTime: null,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { ...defaultTrip, ...overrides };
  }

  // Create multiple users for testing
  static createUsers(count = 5) {
    const users = [];
    for (let i = 0; i < count; i++) {
      if (i === 0) users.push(this.USERS.admin());
      else if (i <= 2) users.push(this.USERS.parent({ id: `parent-${i}` }));
      else users.push(this.USERS.student({ id: `student-${i}` }));
    }
    return users;
  }

  // Get all school configurations
  static getAllSchools() {
    return [
      this.SCHOOLS.tesla(),
      this.SCHOOLS.lincoln(),
      this.SCHOOLS.mainElementary(),
    ];
  }

  // Create assignment with proper structure
  static createAssignment(overrides = {}) {
    const assignment = {
      id: "assignment-1",
      templateSlotId: "template-monday-morning-dropoff",
      date: new Date().toISOString().split("T")[0],
      dayOfWeek: 1,
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Monday Morning School Drop-off",
      driverId: "parent-1",
      driverName: "Sarah Johnson",
      driverContact: {
        email: "parent@tesla.edu",
        phoneNumber: "555-0123",
      },
      passengerIds: ["student-1", "student-2"],
      passengers: [
        {
          id: "student-1",
          name: "Emma Wilson",
          phoneNumber: "555-0126",
        },
        {
          id: "student-2",
          name: "Lucas Chen",
          phoneNumber: "555-0124",
        },
      ],
      passengerCount: 2,
      pickupLocation: "123 Maple Street",
      dropoffLocation: "Tesla STEM High School",
      status: "confirmed",
      assignmentMethod: "automatic",
      reminder24hSent: false,
      reminder2hSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { ...assignment, ...overrides };
  }

  // Get standard user set for common scenarios
  static getStandardUserSet() {
    return {
      admin: this.USERS.admin(),
      parents: [
        this.USERS.parent(),
        this.USERS.parent({
          id: "parent-2",
          email: "parent2@tesla.edu",
          firstName: "Michael",
          lastName: "Chen",
          phoneNumber: "555-0124",
        }),
        this.USERS.parent({
          id: "parent-3",
          email: "parent3@lincoln.edu",
          firstName: "Lisa",
          lastName: "Davis",
          phoneNumber: "555-0125",
        }),
      ],
      students: [
        this.USERS.student(),
        this.USERS.student({
          id: "student-2",
          email: "student2@tesla.edu",
          firstName: "Lucas",
          lastName: "Chen",
          phoneNumber: "555-0124",
        }),
        this.USERS.student({
          id: "student-3",
          email: "student3@lincoln.edu",
          firstName: "Sophie",
          lastName: "Davis",
          phoneNumber: "555-0125",
        }),
      ],
      tripAdmin: this.USERS.tripAdmin(),
    };
  }

  // Create mock assignments for a week
  static createWeeklyAssignments(weekStartDate) {
    const assignments = [];
    const standardUsers = this.getStandardUserSet();

    // Monday morning dropoff
    assignments.push(
      this.createAssignment({
        id: "assignment-monday-1",
        date: weekStartDate,
        dayOfWeek: 1,
        description: "Monday Morning School Drop-off",
        passengers: [
          { id: "student-1", name: "Emma Wilson", phoneNumber: "555-0126" },
          { id: "student-2", name: "Lucas Chen", phoneNumber: "555-0124" },
          { id: "student-3", name: "Sophie Davis", phoneNumber: "555-0125" },
        ],
        passengerCount: 3,
      })
    );

    // Wednesday afternoon pickup
    const wednesdayDate = new Date(weekStartDate);
    wednesdayDate.setDate(wednesdayDate.getDate() + 2);
    assignments.push(
      this.createAssignment({
        id: "assignment-wednesday-1",
        templateSlotId: "template-wednesday-afternoon-pickup",
        date: wednesdayDate.toISOString().split("T")[0],
        dayOfWeek: 3,
        startTime: "15:00",
        endTime: "16:00",
        routeType: "school_pickup",
        description: "Wednesday Afternoon School Pick-up",
        driverId: "parent-2",
        driverName: "Michael Chen",
        driverContact: {
          email: "parent2@tesla.edu",
          phoneNumber: "555-0124",
        },
        passengers: [
          { id: "student-4", name: "Alex Thompson", phoneNumber: "555-0127" },
          { id: "student-5", name: "Maya Patel", phoneNumber: "555-0128" },
        ],
        passengerCount: 2,
        pickupLocation: "Tesla STEM High School",
        dropoffLocation: "456 Oak Avenue",
      })
    );

    // Friday morning dropoff
    const fridayDate = new Date(weekStartDate);
    fridayDate.setDate(fridayDate.getDate() + 4);
    assignments.push(
      this.createAssignment({
        id: "assignment-friday-1",
        templateSlotId: "template-friday-morning-dropoff",
        date: fridayDate.toISOString().split("T")[0],
        dayOfWeek: 5,
        description: "Friday Morning School Drop-off",
        driverId: "parent-3",
        driverName: "Lisa Davis",
        driverContact: {
          email: "parent3@lincoln.edu",
          phoneNumber: "555-0125",
        },
        passengers: [
          { id: "student-6", name: "Ryan Martinez", phoneNumber: "555-0129" },
        ],
        passengerCount: 1,
      })
    );

    return assignments;
  }

  // Create carpool group with configurable overrides
  static createGroup(overrides = {}) {
    const standardUsers = this.getStandardUserSet();

    const defaultGroup = {
      id: "group-1",
      name: "Tesla STEM Morning Carpool",
      description: "Daily morning drop-off carpool for Tesla STEM High School",
      school: "Tesla STEM High School",
      pickupLocation: "Maple Street Neighborhood",
      dropoffLocation: "Tesla STEM High School",
      maxMembers: 8,
      currentMembers: 5,
      status: "active",
      schedule: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "07:30",
        endTime: "08:30",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminId: "admin-123",
      members: [
        {
          id: "member-1",
          userId: "parent-1",
          name: "Sarah Johnson",
          email: "parent@tesla.edu",
          role: "parent",
          joinedAt: new Date().toISOString(),
          children: [
            { id: "child-1", name: "Emma Johnson", grade: "3rd" },
            { id: "child-2", name: "Jake Johnson", grade: "1st" },
          ],
        },
        {
          id: "member-2",
          userId: "parent-2",
          name: "Michael Chen",
          email: "parent2@tesla.edu",
          role: "parent",
          joinedAt: new Date().toISOString(),
          children: [{ id: "child-3", name: "Lucas Chen", grade: "2nd" }],
        },
      ],
      invitations: [
        {
          id: "invite-1",
          email: "parent3@lincoln.edu",
          name: "Jennifer Davis",
          role: "parent",
          status: "pending",
          sentAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          message: "Join our morning carpool group!",
        },
      ],
    };

    return { ...defaultGroup, ...overrides };
  }

  // Create multiple groups for testing
  static createGroups() {
    return [
      this.createGroup(),
      this.createGroup({
        id: "group-2",
        name: "Tesla STEM Afternoon Pickup",
        description:
          "Daily afternoon pickup carpool for Tesla STEM High School",
        pickupLocation: "Tesla STEM High School",
        dropoffLocation: "Oak Avenue Neighborhood",
        maxMembers: 6,
        currentMembers: 3,
        schedule: {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: "15:00",
          endTime: "16:00",
        },
        members: [
          {
            id: "member-3",
            userId: "parent-3",
            name: "Jennifer Davis",
            email: "parent3@lincoln.edu",
            role: "parent",
            joinedAt: new Date().toISOString(),
            children: [{ id: "child-4", name: "Sophie Davis", grade: "4th" }],
          },
        ],
        invitations: [],
      }),
      this.createGroup({
        id: "group-3",
        name: "Lincoln Elementary Carpool",
        description: "Mixed schedule carpool for Lincoln Elementary",
        school: "Lincoln Elementary",
        pickupLocation: "Lincoln Neighborhood",
        dropoffLocation: "Lincoln Elementary",
        maxMembers: 10,
        currentMembers: 7,
        schedule: {
          days: ["Monday", "Wednesday", "Friday"],
          startTime: "08:00",
          endTime: "09:00",
        },
        members: [
          {
            id: "member-4",
            userId: "parent-4",
            name: "Lisa Martinez",
            email: "parent4@lincoln.edu",
            role: "parent",
            joinedAt: new Date().toISOString(),
            children: [
              { id: "child-5", name: "Alex Martinez", grade: "K" },
              { id: "child-6", name: "Maya Martinez", grade: "2nd" },
            ],
          },
        ],
        invitations: [],
      }),
    ];
  }
}

module.exports = { MockDataFactory };
