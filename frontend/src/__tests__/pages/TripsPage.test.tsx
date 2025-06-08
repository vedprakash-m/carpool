// TripsPage Tests - UX Requirements Alignment
// Testing alignment with User_Experience.md requirements:
// - Group Discovery & Join Request: Trip browsing, request workflows, and group joining
// - Weekly Preference Submission: Schedule preferences and recurring trip management
// - Group Admin Schedule Management: Administrative trip management and coordination
// - Family Unit Structure: Family-oriented trip organization and child-specific scheduling
// - Emergency Response Context: Emergency contact display and crisis coordination features
// - Progressive Parent Onboarding: Family-aware trip discovery and recommendation engine

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter } from "next/navigation";
import TripsPage from "../../app/trips/page";
import { useAuthStore } from "../../store/auth.store";
import { useTripStore } from "../../store/trip.store";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { mockTrips } from "../mocks/trips";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock stores
jest.mock("../../store/auth.store");
jest.mock("../../store/trip.store");

// Mock DashboardLayout
jest.mock("../../components/DashboardLayout", () => {
  return ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  );
});

// Mock SectionErrorBoundary
jest.mock("../../components/SectionErrorBoundary", () => ({
  SectionErrorBoundary: ({
    children,
    sectionName,
  }: {
    children: React.ReactNode;
    sectionName: string;
  }) => (
    <div
      data-testid={`section-${sectionName.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {children}
    </div>
  ),
}));

// Mock AdvancedTripSearch component
jest.mock("../../components/AdvancedTripSearch", () => {
  return ({
    onSearch,
    onFilter,
  }: {
    onSearch: (query: string) => void;
    onFilter: (filters: any) => void;
  }) => (
    <div data-testid="advanced-trip-search">
      <input
        data-testid="search-input"
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search trips..."
      />
      <button
        data-testid="filter-button"
        onClick={() => onFilter({ type: "school", time: "morning" })}
      >
        Apply Filters
      </button>
    </div>
  );
});

// Mock LoadingSpinner
jest.mock("../../components/LoadingSpinner", () => {
  return () => <div data-testid="loading-spinner">Loading...</div>;
});

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CalendarIcon: () => <svg data-testid="calendar-icon" />,
  TruckIcon: () => <svg data-testid="truck-icon" />,
  UserIcon: () => <svg data-testid="user-icon" />,
  ClockIcon: () => <svg data-testid="clock-icon" />,
  MapPinIcon: () => <svg data-testid="mappin-icon" />,
  CurrencyDollarIcon: () => <svg data-testid="currency-icon" />,
  PlusIcon: () => <svg data-testid="plus-icon" />,
  MagnifyingGlassIcon: () => <svg data-testid="search-icon" />,
  FunnelIcon: () => <svg data-testid="funnel-icon" />,
  UserGroupIcon: () => <svg data-testid="usergroup-icon" />,
}));

const server = setupServer(
  http.get("/api/trips", () => {
    return HttpResponse.json({ trips: mockTrips });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TripsPage - UX Requirements Alignment", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: "/trips",
    query: {},
    asPath: "/trips",
  };

  // Family-oriented user data aligned with UX requirements
  const mockFamilyParentUser = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@lincoln.edu",
    role: "parent",
    schoolDomain: "lincoln.edu",
    familyId: "family-456",
    children: [
      {
        id: "child-1",
        firstName: "Emma",
        lastName: "Doe",
        grade: "3rd",
        school: "Lincoln Elementary",
        emergencyContacts: ["contact-1", "contact-2"],
      },
      {
        id: "child-2",
        firstName: "Lucas",
        lastName: "Doe",
        grade: "1st",
        school: "Lincoln Elementary",
        emergencyContacts: ["contact-1", "contact-2"],
      },
    ],
    emergencyContacts: [
      {
        id: "contact-1",
        name: "Sarah Doe",
        relationship: "mother",
        phone: "555-0101",
      },
      {
        id: "contact-2",
        name: "Mike Johnson",
        relationship: "uncle",
        phone: "555-0102",
      },
    ],
    onboardingCompleted: true,
    weeklyPreferences: {
      morningDropoff: { preferred: true, flexibleTiming: false },
      afternoonPickup: { preferred: true, flexibleTiming: true },
      recurringDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
  };

  const mockGroupAdminUser = {
    id: "admin-789",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@lincoln.edu",
    role: "parent",
    schoolDomain: "lincoln.edu",
    familyId: "family-789",
    groupAdminRoles: ["group-1", "group-2"],
    children: [
      {
        id: "child-3",
        firstName: "Olivia",
        lastName: "Johnson",
        grade: "2nd",
        school: "Lincoln Elementary",
        emergencyContacts: ["contact-3"],
      },
    ],
    emergencyContacts: [
      {
        id: "contact-3",
        name: "David Johnson",
        relationship: "father",
        phone: "555-0103",
      },
    ],
    onboardingCompleted: true,
  };

  // Family-oriented trip data reflecting Group Discovery & Join Request workflows
  const mockFamilyTrips = [
    {
      id: "trip-1",
      type: "school",
      title: "Morning School Run - Lincoln Elementary",
      departureTime: "2024-01-15T07:30:00Z",
      arrivalTime: "2024-01-15T08:00:00Z",
      origin: "Maple Street & 5th Ave",
      destination: "Lincoln Elementary School",
      driver: mockGroupAdminUser,
      availableSeats: 2,
      totalSeats: 4,
      costPerSeat: 3.5,
      status: "active",
      school: "Lincoln Elementary",
      groupId: "group-1",
      groupName: "Lincoln Morning Riders",
      participants: [
        {
          familyId: "family-456",
          parentId: "user-123",
          children: ["child-1", "child-2"],
          joinStatus: "pending",
          joinRequestDate: "2024-01-10T10:00:00Z",
        },
        {
          familyId: "family-999",
          parentId: "user-999",
          children: ["child-4"],
          joinStatus: "approved",
          joinRequestDate: "2024-01-05T09:00:00Z",
        },
      ],
      isRecurring: true,
      recurringDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      weeklyPreferences: {
        flexible: false,
        backupDrivers: ["user-456"],
        emergencyProtocol: "active",
      },
      groupAdminId: "admin-789",
      emergencyContacts: ["contact-3", "contact-1"],
      childSafetyFeatures: {
        childSeats: 2,
        verifiedDriver: true,
        backgroundCheckCompleted: true,
      },
    },
    {
      id: "trip-2",
      type: "school",
      title: "Afternoon Pickup - Lincoln Elementary",
      departureTime: "2024-01-15T15:15:00Z",
      arrivalTime: "2024-01-15T15:45:00Z",
      origin: "Lincoln Elementary School",
      destination: "Oak Park Neighborhood",
      driver: mockFamilyParentUser,
      availableSeats: 1,
      totalSeats: 3,
      costPerSeat: 2.75,
      status: "active",
      school: "Lincoln Elementary",
      groupId: "group-2",
      groupName: "Oak Park Afternoon Group",
      participants: [
        {
          familyId: "family-456",
          parentId: "user-123",
          children: ["child-1", "child-2"],
          joinStatus: "approved",
          joinRequestDate: "2024-01-01T14:00:00Z",
        },
        {
          familyId: "family-789",
          parentId: "admin-789",
          children: ["child-3"],
          joinStatus: "approved",
          joinRequestDate: "2024-01-02T14:30:00Z",
        },
      ],
      isRecurring: true,
      recurringDays: ["monday", "wednesday", "friday"],
      weeklyPreferences: {
        flexible: true,
        backupDrivers: ["admin-789"],
        emergencyProtocol: "active",
      },
      groupAdminId: "user-123",
      emergencyContacts: ["contact-1", "contact-2", "contact-3"],
      childSafetyFeatures: {
        childSeats: 3,
        verifiedDriver: true,
        backgroundCheckCompleted: true,
      },
    },
  ];

  // Family-aware store mocks aligned with UX requirements
  const mockAuthStore = {
    user: mockFamilyParentUser,
    isAuthenticated: true,
    isLoading: false,
    familyContext: {
      familyId: "family-456",
      children: mockFamilyParentUser.children,
      emergencyContacts: mockFamilyParentUser.emergencyContacts,
      weeklyPreferences: mockFamilyParentUser.weeklyPreferences,
    },
  };

  const mockTripStore = {
    trips: mockFamilyTrips,
    myTrips: [mockFamilyTrips[1]], // User is driver for trip-2
    availableTrips: [mockFamilyTrips[0]], // User can request to join trip-1
    joinRequests: [
      {
        tripId: "trip-1",
        familyId: "family-456",
        status: "pending",
        requestDate: "2024-01-10T10:00:00Z",
        children: ["child-1", "child-2"],
      },
    ],
    groupMemberships: [
      {
        groupId: "group-2",
        groupName: "Oak Park Afternoon Group",
        role: "admin",
        status: "active",
      },
    ],
    loading: false,
    searchQuery: "",
    filters: {},
    fetchTrips: jest.fn(),
    fetchMyTrips: jest.fn(),
    fetchAvailableTrips: jest.fn(),
    joinTrip: jest.fn(),
    leaveTrip: jest.fn(),
    submitJoinRequest: jest.fn(),
    manageJoinRequest: jest.fn(),
    setSearchQuery: jest.fn(),
    setFilters: jest.fn(),
    updateWeeklyPreferences: jest.fn(),
    fetchGroupMemberships: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockAuthStore);
    (useTripStore as unknown as jest.Mock).mockReturnValue(mockTripStore);
    jest.clearAllMocks();
  });

  // Family-Centered Page Layout and Navigation - Aligned with Progressive Parent Onboarding
  describe("Family-Centered Page Layout and Navigation", () => {
    it("should render trips page with family-aware dashboard layout", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });

    it("should display family-oriented page header with children context", () => {
      render(<TripsPage />);

      expect(screen.getByText("Family Trip Management")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Organize safe, reliable transportation for Emma and Lucas"
        )
      ).toBeInTheDocument();
    });

    it("should show family context with children names and schools", () => {
      render(<TripsPage />);

      expect(screen.getByText("Emma (3rd Grade)")).toBeInTheDocument();
      expect(screen.getByText("Lucas (1st Grade)")).toBeInTheDocument();
      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
    });

    it("should have create group button for family administrators", () => {
      render(<TripsPage />);

      const createButton = screen.getByRole("button", {
        name: /create carpool group/i,
      });
      expect(createButton).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("should navigate to group creation when create button clicked", () => {
      render(<TripsPage />);

      const createButton = screen.getByRole("button", {
        name: /create carpool group/i,
      });
      fireEvent.click(createButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/groups/create");
    });

    it("should display emergency contacts summary for family safety", () => {
      render(<TripsPage />);

      expect(screen.getByText("Emergency Contacts (2)")).toBeInTheDocument();
      expect(screen.getByText("Sarah Doe, Mike Johnson")).toBeInTheDocument();
    });

    it("should wrap family header in error boundary", () => {
      render(<TripsPage />);

      expect(
        screen.getByTestId("section-family-trip-header")
      ).toBeInTheDocument();
    });
  });

  // Group Discovery & Join Request Navigation - Core UX Journey
  describe("Group Discovery & Join Request Navigation", () => {
    it("should display group-based navigation tabs", () => {
      render(<TripsPage />);

      expect(
        screen.getByRole("button", { name: /my carpool groups/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /discover groups/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /join requests/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /admin groups/i })
      ).toBeInTheDocument();
    });

    it('should have "my carpool groups" tab active by default', () => {
      render(<TripsPage />);

      const myGroupsTab = screen.getByRole("button", {
        name: /my carpool groups/i,
      });
      expect(myGroupsTab).toHaveClass("border-primary-500", "text-primary-600");
    });

    it("should switch to group discovery when discover tab clicked", () => {
      render(<TripsPage />);

      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      expect(discoverTab).toHaveClass("border-primary-500", "text-primary-600");
    });

    it("should display pending join requests count", () => {
      render(<TripsPage />);

      const joinRequestsTab = screen.getByRole("button", {
        name: /join requests/i,
      });

      expect(screen.getByText("Join Requests (1)")).toBeInTheDocument();
    });

    it("should switch to admin groups tab for group administrators", () => {
      render(<TripsPage />);

      const adminTab = screen.getByRole("button", {
        name: /admin groups/i,
      });
      fireEvent.click(adminTab);

      expect(adminTab).toHaveClass("border-primary-500", "text-primary-600");
    });

    it("should fetch appropriate group data when switching tabs", () => {
      render(<TripsPage />);

      // Switch to discover groups
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      expect(mockTripStore.fetchAvailableTrips).toHaveBeenCalled();

      // Switch to join requests
      const requestsTab = screen.getByRole("button", {
        name: /join requests/i,
      });
      fireEvent.click(requestsTab);

      expect(mockTripStore.fetchGroupMemberships).toHaveBeenCalled();
    });
  });

  // Family-Focused Group Search and Discovery - Enhanced UX Experience
  describe("Family-Focused Group Search and Discovery", () => {
    it("should display family-oriented group search component", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("advanced-trip-search")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "Search by school, neighborhood, or group name..."
        )
      ).toBeInTheDocument();
    });

    it("should provide child-specific search filters", () => {
      render(<TripsPage />);

      expect(screen.getByText("Filter by Children")).toBeInTheDocument();
      expect(screen.getByText("Emma (3rd Grade)")).toBeInTheDocument();
      expect(screen.getByText("Lucas (1st Grade)")).toBeInTheDocument();
    });

    it("should handle family-oriented search queries", () => {
      render(<TripsPage />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, {
        target: { value: "Lincoln Elementary morning pickup" },
      });

      expect(mockTripStore.setSearchQuery).toHaveBeenCalledWith(
        "Lincoln Elementary morning pickup"
      );
    });

    it("should apply safety and family-focused filters", () => {
      render(<TripsPage />);

      const filterButton = screen.getByTestId("filter-button");
      fireEvent.click(filterButton);

      expect(mockTripStore.setFilters).toHaveBeenCalledWith({
        type: "school",
        time: "morning",
        safetyVerified: true,
        childSeatsAvailable: true,
        backgroundCheckRequired: true,
      });
    });

    it("should show emergency contact requirements in search", () => {
      render(<TripsPage />);

      expect(
        screen.getByText("Groups with emergency protocols")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Verified parent drivers only")
      ).toBeInTheDocument();
    });

    it("should wrap family search in error boundary", () => {
      render(<TripsPage />);

      expect(
        screen.getByTestId("section-family-group-search")
      ).toBeInTheDocument();
    });
  });

  // Family-Oriented Group Listings - Group Discovery & Join Request Display
  describe("Family-Oriented Group Listings", () => {
    it("should display family groups with children context", () => {
      render(<TripsPage />);

      // Should show family's active group
      expect(screen.getByText("Oak Park Afternoon Group")).toBeInTheDocument();
      expect(screen.getByText("Lincoln Elementary School")).toBeInTheDocument();
      expect(screen.getByText("Active for Emma, Lucas")).toBeInTheDocument();
    });

    it("should display available groups for discovery", () => {
      render(<TripsPage />);

      // Switch to discover groups tab
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      expect(screen.getByText("Lincoln Morning Riders")).toBeInTheDocument();
      expect(
        screen.getByText("Morning School Run - Lincoln Elementary")
      ).toBeInTheDocument();
    });

    it("should show family-oriented group details", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
      expect(screen.getByText("3:15 PM departure")).toBeInTheDocument();
      expect(screen.getByText("$2.75 per child")).toBeInTheDocument();
    });

    it("should display group administrator information", () => {
      render(<TripsPage />);

      expect(screen.getByText("Group Admin: John Doe")).toBeInTheDocument();
      expect(screen.getByText("Verified Parent Driver ✓")).toBeInTheDocument();
    });

    it("should show child safety features prominently", () => {
      render(<TripsPage />);

      expect(screen.getByText("3 child seats available")).toBeInTheDocument();
      expect(
        screen.getByText("Background check completed ✓")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Emergency contacts: 3 active")
      ).toBeInTheDocument();
    });

    it("should display recurring schedule with family-friendly format", () => {
      render(<TripsPage />);

      expect(screen.getByText("🔄 Weekly Schedule")).toBeInTheDocument();
      expect(screen.getByText("Mon, Wed, Fri")).toBeInTheDocument();
      expect(screen.getByText("Backup drivers available")).toBeInTheDocument();
    });

    it("should show current family's children participation", () => {
      render(<TripsPage />);

      expect(screen.getByText("Emma and Lucas riding")).toBeInTheDocument();
      expect(screen.getByText("Since January 2024")).toBeInTheDocument();
    });
  });

  // Group Join Request Actions & Management - Core UX Workflow
  describe("Group Join Request Actions & Management", () => {
    it("should display join request button for available groups", () => {
      render(<TripsPage />);

      // Switch to discover groups
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      expect(
        screen.getByRole("button", { name: /request to join group/i })
      ).toBeInTheDocument();
    });

    it("should handle submitting a family join request", async () => {
      mockTripStore.submitJoinRequest.mockResolvedValue({ success: true });

      render(<TripsPage />);

      // Switch to discover groups
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      const joinButton = screen.getByRole("button", {
        name: /request to join group/i,
      });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockTripStore.submitJoinRequest).toHaveBeenCalledWith({
          tripId: "trip-1",
          familyId: "family-456",
          children: ["child-1", "child-2"],
          message: expect.any(String),
        });
      });
    });

    it("should display pending join request status", () => {
      render(<TripsPage />);

      // Switch to join requests tab
      const requestsTab = screen.getByRole("button", {
        name: /join requests/i,
      });
      fireEvent.click(requestsTab);

      expect(screen.getByText("Request Pending")).toBeInTheDocument();
      expect(screen.getByText("Submitted Jan 10, 2024")).toBeInTheDocument();
      expect(screen.getByText("For Emma and Lucas")).toBeInTheDocument();
    });

    it("should show leave group option for active memberships", () => {
      render(<TripsPage />);

      expect(
        screen.getByRole("button", { name: /leave group/i })
      ).toBeInTheDocument();
    });

    it("should handle leaving a family group", async () => {
      mockTripStore.leaveTrip.mockResolvedValue({ success: true });

      render(<TripsPage />);

      const leaveButton = screen.getByRole("button", { name: /leave group/i });
      fireEvent.click(leaveButton);

      await waitFor(() => {
        expect(mockTripStore.leaveTrip).toHaveBeenCalledWith({
          tripId: "trip-2",
          familyId: "family-456",
        });
      });
    });

    it("should display group admin management options", () => {
      render(<TripsPage />);

      // Switch to admin groups
      const adminTab = screen.getByRole("button", {
        name: /admin groups/i,
      });
      fireEvent.click(adminTab);

      expect(
        screen.getByRole("button", { name: /manage group/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /review join requests/i })
      ).toBeInTheDocument();
    });

    it("should navigate to group management when admin clicks manage", () => {
      render(<TripsPage />);

      // Switch to admin groups
      const adminTab = screen.getByRole("button", {
        name: /admin groups/i,
      });
      fireEvent.click(adminTab);

      const manageButton = screen.getByRole("button", {
        name: /manage group/i,
      });
      fireEvent.click(manageButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/groups/trip-2/manage");
    });

    it("should display group details link for transparency", () => {
      render(<TripsPage />);

      const detailsLink = screen.getByRole("link", {
        name: /view group details/i,
      });
      expect(detailsLink).toHaveAttribute("href", "/groups/trip-2");
    });
  });

  // Family-Focused Loading States and Error Handling - Enhanced UX
  describe("Family-Focused Loading States and Error Handling", () => {
    it("should display family-aware loading spinner initially", () => {
      render(<TripsPage />);
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(
        screen.getByText("Loading your family's carpool groups...")
      ).toBeInTheDocument();
    });

    it("should display family-oriented empty state when no groups available", async () => {
      server.use(
        http.get("/api/trips", () => {
          return HttpResponse.json({ trips: [] });
        })
      );
      render(<TripsPage />);
      expect(
        await screen.findByText(/no carpool groups yet/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Start by discovering groups in your area or creating your own"
        )
      ).toBeInTheDocument();
    });

    it("should handle join request errors with family context", async () => {
      mockTripStore.submitJoinRequest.mockRejectedValue(
        new Error("Group is full")
      );

      render(<TripsPage />);

      // Switch to discover groups
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      const joinButton = screen.getByRole("button", {
        name: /request to join group/i,
      });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(
          screen.getByText("Unable to submit join request for your family")
        ).toBeInTheDocument();
      });
    });

    it("should show emergency contact validation errors", async () => {
      render(<TripsPage />);

      expect(
        screen.getByText("⚠️ Please add at least 2 emergency contacts")
      ).toBeInTheDocument();
    });

    it("should wrap family group listings in error boundaries", () => {
      render(<TripsPage />);

      expect(
        screen.getByTestId("section-family-group-listings")
      ).toBeInTheDocument();
    });
  });

  // Enhanced Family-School Integration Features - UX Alignment
  describe("Enhanced Family-School Integration Features", () => {
    it("should display school names with family context", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
      expect(screen.getByText("Emma's and Lucas's school")).toBeInTheDocument();
    });

    it("should show family-friendly morning and afternoon schedules", () => {
      render(<TripsPage />);

      expect(screen.getByText("Afternoon Pickup")).toBeInTheDocument();
      expect(
        screen.getByText("Perfect for after-school activities")
      ).toBeInTheDocument();

      // Switch to discover groups to see morning options
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      expect(
        screen.getByText("Morning School Run - Lincoln Elementary")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Reliable daily transportation")
      ).toBeInTheDocument();
    });

    it("should display weekly schedule with family planning focus", () => {
      render(<TripsPage />);

      expect(screen.getByText("Mon, Wed, Fri")).toBeInTheDocument();
      expect(
        screen.getByText("Matches your weekly preferences")
      ).toBeInTheDocument();
    });

    it("should show child-specific pickup and drop-off locations", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary School")).toBeInTheDocument();
      expect(screen.getByText("Oak Park Neighborhood")).toBeInTheDocument();
      expect(
        screen.getByText("Near Emma and Lucas's activities")
      ).toBeInTheDocument();
    });

    it("should display family budget-friendly cost information", () => {
      render(<TripsPage />);

      expect(screen.getByText("$2.75 per child")).toBeInTheDocument();
      expect(
        screen.getByText("$5.50 total for both children")
      ).toBeInTheDocument();
      expect(screen.getByText("Weekly cost: $27.50")).toBeInTheDocument();
    });

    it("should show grade-appropriate grouping information", () => {
      render(<TripsPage />);

      expect(screen.getByText("Elementary school group")).toBeInTheDocument();
      expect(screen.getByText("Ages 5-10 welcome")).toBeInTheDocument();
      expect(screen.getByText("Mixed grade levels")).toBeInTheDocument();
    });
  });

  // Family-Centered VCarpool Business Logic Integration - UX Optimized
  describe("Family-Centered VCarpool Business Logic Integration", () => {
    it("should prioritize family-friendly school groups in listings", () => {
      render(<TripsPage />);

      // All displayed groups should be family-oriented
      expect(screen.getByText("🏫 Family School Group")).toBeInTheDocument();
      expect(screen.getByText("Safe for children")).toBeInTheDocument();
    });

    it("should show parent-friendly time formats with context", () => {
      render(<TripsPage />);

      // Should display time in family-friendly format
      expect(screen.getByText("3:15 PM departure")).toBeInTheDocument();
      expect(
        screen.getByText("Perfect for after-school pickup")
      ).toBeInTheDocument();
      expect(screen.getByText("7:30 AM departure")).toBeInTheDocument();
      expect(
        screen.getByText("Arrives before school starts")
      ).toBeInTheDocument();
    });

    it("should display comprehensive safety information", () => {
      render(<TripsPage />);

      expect(
        screen.getByText("✓ Background check completed")
      ).toBeInTheDocument();
      expect(screen.getByText("✓ Verified parent driver")).toBeInTheDocument();
      expect(
        screen.getByText("✓ Emergency contacts active")
      ).toBeInTheDocument();
      expect(
        screen.getByText("✓ Child safety seats available")
      ).toBeInTheDocument();
    });

    it("should emphasize family-oriented features prominently", () => {
      render(<TripsPage />);

      expect(
        screen.getByText("Safe and reliable family transportation")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Parent community you can trust")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Emergency support available")
      ).toBeInTheDocument();
    });

    it("should show group capacity with family planning context", () => {
      render(<TripsPage />);

      expect(screen.getByText("1 family spot available")).toBeInTheDocument();
      expect(screen.getByText("Room for 2 more children")).toBeInTheDocument();
      expect(screen.getByText("Perfect for siblings")).toBeInTheDocument();
    });

    it("should display weekly schedule preferences alignment", () => {
      render(<TripsPage />);

      expect(
        screen.getByText("Matches your weekly preferences")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Flexible pickup times available")
      ).toBeInTheDocument();
    });

    it("should show emergency preparedness features", () => {
      render(<TripsPage />);

      expect(screen.getByText("Emergency protocol active")).toBeInTheDocument();
      expect(screen.getByText("Backup drivers available")).toBeInTheDocument();
      expect(
        screen.getByText("Emergency contacts: 3 active")
      ).toBeInTheDocument();
    });
  });

  // Enhanced Performance and Family-Focused Responsiveness - UX Optimized
  describe("Enhanced Performance and Family-Focused Responsiveness", () => {
    it("should render family-oriented interface without errors", () => {
      expect(() => render(<TripsPage />)).not.toThrow();
    });

    it("should handle rapid family tab switching smoothly", () => {
      render(<TripsPage />);

      const myGroupsTab = screen.getByRole("button", {
        name: /my carpool groups/i,
      });
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      const requestsTab = screen.getByRole("button", {
        name: /join requests/i,
      });
      const adminTab = screen.getByRole("button", {
        name: /admin groups/i,
      });

      // Rapidly switch tabs
      fireEvent.click(discoverTab);
      fireEvent.click(requestsTab);
      fireEvent.click(adminTab);
      fireEvent.click(myGroupsTab);

      expect(myGroupsTab).toHaveClass("border-primary-500");
    });

    it("should handle empty family search results gracefully", () => {
      (useTripStore as unknown as jest.Mock).mockReturnValue({
        ...mockTripStore,
        trips: [],
        searchQuery: "nonexistent school",
      });

      render(<TripsPage />);

      expect(
        screen.getByText(/no carpool groups match your family's needs/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText("Try searching for your school or neighborhood")
      ).toBeInTheDocument();
    });

    it("should use family-focused loading states for join requests", async () => {
      let resolveJoin: (value: any) => void;
      const joinPromise = new Promise((resolve) => {
        resolveJoin = resolve;
      });

      mockTripStore.submitJoinRequest.mockReturnValue(joinPromise);

      render(<TripsPage />);

      // Switch to discover groups and try to submit join request
      const discoverTab = screen.getByRole("button", {
        name: /discover groups/i,
      });
      fireEvent.click(discoverTab);

      const joinButton = screen.getByRole("button", {
        name: /request to join group/i,
      });
      fireEvent.click(joinButton);

      // Should show family-focused loading state
      expect(
        screen.getByText(/submitting request for your family.../i)
      ).toBeInTheDocument();
      expect(screen.getByText("This may take a moment")).toBeInTheDocument();

      // Resolve the promise
      resolveJoin!({ success: true });

      await waitFor(() => {
        expect(
          screen.queryByText(/submitting request.../i)
        ).not.toBeInTheDocument();
        expect(
          screen.getByText("Join request submitted successfully!")
        ).toBeInTheDocument();
      });
    });

    it("should handle weekly preferences updates efficiently", async () => {
      render(<TripsPage />);

      const preferencesButton = screen.getByRole("button", {
        name: /update weekly preferences/i,
      });
      fireEvent.click(preferencesButton);

      await waitFor(() => {
        expect(mockTripStore.updateWeeklyPreferences).toHaveBeenCalledWith({
          familyId: "family-456",
          preferences: expect.any(Object),
        });
      });
    });

    it("should provide family-oriented accessibility features", () => {
      render(<TripsPage />);

      // Should have proper ARIA labels for family context
      expect(
        screen.getByLabelText("Your family's carpool groups")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Available groups for Emma and Lucas")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Emergency contacts for family safety")
      ).toBeInTheDocument();
    });
  });
});
