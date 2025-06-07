import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import TripsPage from "../../app/trips/page";
import { useAuthStore } from "../../store/auth.store";
import { useTripStore } from "../../store/trip.store";

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

describe("TripsPage", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: "/trips",
    query: {},
    asPath: "/trips",
  };

  const mockUser = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@lincoln.edu",
    role: "parent",
    schoolDomain: "lincoln.edu",
  };

  const mockTrips = [
    {
      id: "trip-1",
      type: "school",
      title: "Morning School Run",
      departureTime: "2024-01-15T07:30:00Z",
      arrivalTime: "2024-01-15T08:00:00Z",
      origin: "Maple Street & 5th Ave",
      destination: "Lincoln Elementary School",
      driver: {
        id: "driver-1",
        firstName: "Sarah",
        lastName: "Johnson",
        rating: 4.8,
      },
      availableSeats: 2,
      totalSeats: 4,
      costPerSeat: 3.5,
      status: "active",
      school: "Lincoln Elementary",
      participants: ["user-123", "user-456"],
      isRecurring: true,
      recurringDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    {
      id: "trip-2",
      type: "school",
      title: "Afternoon Pickup",
      departureTime: "2024-01-15T15:15:00Z",
      arrivalTime: "2024-01-15T15:45:00Z",
      origin: "Lincoln Elementary School",
      destination: "Oak Park Neighborhood",
      driver: {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        rating: 4.9,
      },
      availableSeats: 1,
      totalSeats: 3,
      costPerSeat: 2.75,
      status: "active",
      school: "Lincoln Elementary",
      participants: ["user-123", "user-789"],
      isRecurring: true,
      recurringDays: ["monday", "wednesday", "friday"],
    },
  ];

  const mockAuthStore = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  };

  const mockTripStore = {
    trips: mockTrips,
    myTrips: [mockTrips[1]], // User is driver for trip-2
    availableTrips: [mockTrips[0]], // User can join trip-1
    loading: false,
    searchQuery: "",
    filters: {},
    fetchTrips: jest.fn(),
    fetchMyTrips: jest.fn(),
    fetchAvailableTrips: jest.fn(),
    joinTrip: jest.fn(),
    leaveTrip: jest.fn(),
    setSearchQuery: jest.fn(),
    setFilters: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);
    (useTripStore as jest.Mock).mockReturnValue(mockTripStore);
    jest.clearAllMocks();
  });

  describe("Page Layout and Navigation", () => {
    it("should render trips page with dashboard layout", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });

    it("should display page header with title and description", () => {
      render(<TripsPage />);

      expect(screen.getByText("Trips")).toBeInTheDocument();
      expect(
        screen.getByText("Manage your trips and find available rides")
      ).toBeInTheDocument();
    });

    it("should have create trip button in header", () => {
      render(<TripsPage />);

      const createButton = screen.getByRole("button", { name: /create trip/i });
      expect(createButton).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("should navigate to create trip page when create button clicked", () => {
      render(<TripsPage />);

      const createButton = screen.getByRole("button", { name: /create trip/i });
      fireEvent.click(createButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/trips/create");
    });

    it("should wrap header in error boundary", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("section-trip-header")).toBeInTheDocument();
    });
  });

  describe("Trip Tabs Navigation", () => {
    it("should display all trip tab options", () => {
      render(<TripsPage />);

      expect(
        screen.getByRole("button", { name: /my trips/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /available trips/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /trips i'm driving/i })
      ).toBeInTheDocument();
    });

    it('should have "my trips" tab active by default', () => {
      render(<TripsPage />);

      const myTripsTab = screen.getByRole("button", { name: /my trips/i });
      expect(myTripsTab).toHaveClass("border-primary-500", "text-primary-600");
    });

    it("should switch to available trips tab when clicked", () => {
      render(<TripsPage />);

      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      expect(availableTab).toHaveClass(
        "border-primary-500",
        "text-primary-600"
      );
    });

    it("should switch to driving trips tab when clicked", () => {
      render(<TripsPage />);

      const drivingTab = screen.getByRole("button", {
        name: /trips i'm driving/i,
      });
      fireEvent.click(drivingTab);

      expect(drivingTab).toHaveClass("border-primary-500", "text-primary-600");
    });

    it("should fetch appropriate trip data when switching tabs", () => {
      render(<TripsPage />);

      // Switch to available trips
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      expect(mockTripStore.fetchAvailableTrips).toHaveBeenCalled();

      // Switch to driving trips
      const drivingTab = screen.getByRole("button", {
        name: /trips i'm driving/i,
      });
      fireEvent.click(drivingTab);

      expect(mockTripStore.fetchMyTrips).toHaveBeenCalled();
    });
  });

  describe("Trip Search and Filtering", () => {
    it("should display advanced trip search component", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("advanced-trip-search")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should handle search query changes", () => {
      render(<TripsPage />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, {
        target: { value: "Lincoln Elementary" },
      });

      expect(mockTripStore.setSearchQuery).toHaveBeenCalledWith(
        "Lincoln Elementary"
      );
    });

    it("should handle filter applications", () => {
      render(<TripsPage />);

      const filterButton = screen.getByTestId("filter-button");
      fireEvent.click(filterButton);

      expect(mockTripStore.setFilters).toHaveBeenCalledWith({
        type: "school",
        time: "morning",
      });
    });

    it("should wrap search in error boundary", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("section-trip-search")).toBeInTheDocument();
    });
  });

  describe("Trip Listings Display", () => {
    it("should display my trips when on my trips tab", () => {
      render(<TripsPage />);

      // Should show user's driving trip
      expect(screen.getByText("Afternoon Pickup")).toBeInTheDocument();
      expect(screen.getByText("Oak Park Neighborhood")).toBeInTheDocument();
    });

    it("should display available trips when on available tab", () => {
      render(<TripsPage />);

      // Switch to available trips tab
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      expect(screen.getByText("Morning School Run")).toBeInTheDocument();
      expect(screen.getByText("Lincoln Elementary School")).toBeInTheDocument();
    });

    it("should display trip details including school information", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
      expect(screen.getByText("3:15 PM")).toBeInTheDocument();
      expect(screen.getByText("$2.75")).toBeInTheDocument();
    });

    it("should show driver information for trips", () => {
      render(<TripsPage />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("⭐ 4.9")).toBeInTheDocument();
    });

    it("should display available seats information", () => {
      render(<TripsPage />);

      expect(screen.getByText("1 seat available")).toBeInTheDocument();
    });

    it("should show recurring trip indicators", () => {
      render(<TripsPage />);

      expect(screen.getByText("🔄 Recurring")).toBeInTheDocument();
      expect(screen.getByText("Mon, Wed, Fri")).toBeInTheDocument();
    });
  });

  describe("Trip Actions and Interactions", () => {
    it("should display join button for available trips", () => {
      render(<TripsPage />);

      // Switch to available trips
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      expect(
        screen.getByRole("button", { name: /join trip/i })
      ).toBeInTheDocument();
    });

    it("should handle joining a trip", async () => {
      mockTripStore.joinTrip.mockResolvedValue({ success: true });

      render(<TripsPage />);

      // Switch to available trips
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      const joinButton = screen.getByRole("button", { name: /join trip/i });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockTripStore.joinTrip).toHaveBeenCalledWith("trip-1");
      });
    });

    it("should display leave button for joined trips", () => {
      render(<TripsPage />);

      expect(
        screen.getByRole("button", { name: /leave trip/i })
      ).toBeInTheDocument();
    });

    it("should handle leaving a trip", async () => {
      mockTripStore.leaveTrip.mockResolvedValue({ success: true });

      render(<TripsPage />);

      const leaveButton = screen.getByRole("button", { name: /leave trip/i });
      fireEvent.click(leaveButton);

      await waitFor(() => {
        expect(mockTripStore.leaveTrip).toHaveBeenCalledWith("trip-2");
      });
    });

    it("should display edit button for trips user is driving", () => {
      render(<TripsPage />);

      expect(
        screen.getByRole("button", { name: /edit trip/i })
      ).toBeInTheDocument();
    });

    it("should navigate to trip edit page when edit clicked", () => {
      render(<TripsPage />);

      const editButton = screen.getByRole("button", { name: /edit trip/i });
      fireEvent.click(editButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/trips/trip-2/edit");
    });

    it("should display trip details link", () => {
      render(<TripsPage />);

      const detailsLink = screen.getByRole("link", { name: /view details/i });
      expect(detailsLink).toHaveAttribute("href", "/trips/trip-2");
    });
  });

  describe("Loading States and Error Handling", () => {
    it("should display loading spinner when trips are loading", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        loading: true,
        trips: [],
      });

      render(<TripsPage />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should display empty state when no trips available", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        myTrips: [],
      });

      render(<TripsPage />);

      expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first trip/i)).toBeInTheDocument();
    });

    it("should handle trip action errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockTripStore.joinTrip.mockRejectedValue(new Error("Network error"));

      render(<TripsPage />);

      // Switch to available trips
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      const joinButton = screen.getByRole("button", { name: /join trip/i });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockTripStore.joinTrip).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should wrap trip listings in error boundaries", () => {
      render(<TripsPage />);

      expect(screen.getByTestId("section-trip-listings")).toBeInTheDocument();
    });
  });

  describe("School-Specific Features", () => {
    it("should display school names for all trips", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
    });

    it("should show morning and afternoon trip types", () => {
      render(<TripsPage />);

      expect(screen.getByText("Afternoon Pickup")).toBeInTheDocument();

      // Switch to available trips to see morning run
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      expect(screen.getByText("Morning School Run")).toBeInTheDocument();
    });

    it("should display recurring weekday patterns", () => {
      render(<TripsPage />);

      expect(screen.getByText("Mon, Wed, Fri")).toBeInTheDocument();
    });

    it("should show school-specific pickup and drop-off locations", () => {
      render(<TripsPage />);

      expect(screen.getByText("Lincoln Elementary School")).toBeInTheDocument();
      expect(screen.getByText("Oak Park Neighborhood")).toBeInTheDocument();
      expect(screen.getByText("Maple Street & 5th Ave")).toBeInTheDocument();
    });

    it("should display cost per seat for budget planning", () => {
      render(<TripsPage />);

      expect(screen.getByText("$2.75")).toBeInTheDocument();
      expect(screen.getByText("$3.50")).toBeInTheDocument();
    });
  });

  describe("VCarpool Business Logic Integration", () => {
    it("should prioritize school trips in listings", () => {
      render(<TripsPage />);

      // All displayed trips should be school type
      expect(screen.getByText("🏫 School Trip")).toBeInTheDocument();
    });

    it("should show parent-friendly time formats", () => {
      render(<TripsPage />);

      // Should display time in AM/PM format
      expect(screen.getByText("3:15 PM")).toBeInTheDocument();
      expect(screen.getByText("7:30 AM")).toBeInTheDocument();
    });

    it("should display driver ratings for safety confidence", () => {
      render(<TripsPage />);

      expect(screen.getByText("⭐ 4.9")).toBeInTheDocument();
      expect(screen.getByText("⭐ 4.8")).toBeInTheDocument();
    });

    it("should emphasize family-friendly features", () => {
      render(<TripsPage />);

      expect(screen.getByText(/safe and reliable/i)).toBeInTheDocument();
      expect(screen.getByText(/verified parents/i)).toBeInTheDocument();
    });

    it("should show trip capacity for planning", () => {
      render(<TripsPage />);

      expect(screen.getByText("1 seat available")).toBeInTheDocument();
      expect(screen.getByText("2 seats available")).toBeInTheDocument();
    });
  });

  describe("Performance and Responsiveness", () => {
    it("should render without errors", () => {
      expect(() => render(<TripsPage />)).not.toThrow();
    });

    it("should handle rapid tab switching", () => {
      render(<TripsPage />);

      const myTripsTab = screen.getByRole("button", { name: /my trips/i });
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      const drivingTab = screen.getByRole("button", {
        name: /trips i'm driving/i,
      });

      // Rapidly switch tabs
      fireEvent.click(availableTab);
      fireEvent.click(drivingTab);
      fireEvent.click(myTripsTab);

      expect(myTripsTab).toHaveClass("border-primary-500");
    });

    it("should handle empty search results", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        trips: [],
        searchQuery: "nonexistent",
      });

      render(<TripsPage />);

      expect(
        screen.getByText(/no trips match your search/i)
      ).toBeInTheDocument();
    });

    it("should use proper loading states for async operations", async () => {
      let resolveJoin: (value: any) => void;
      const joinPromise = new Promise((resolve) => {
        resolveJoin = resolve;
      });

      mockTripStore.joinTrip.mockReturnValue(joinPromise);

      render(<TripsPage />);

      // Switch to available trips and try to join
      const availableTab = screen.getByRole("button", {
        name: /available trips/i,
      });
      fireEvent.click(availableTab);

      const joinButton = screen.getByRole("button", { name: /join trip/i });
      fireEvent.click(joinButton);

      // Should show loading state
      expect(screen.getByText(/joining.../i)).toBeInTheDocument();

      // Resolve the promise
      resolveJoin!({ success: true });

      await waitFor(() => {
        expect(screen.queryByText(/joining.../i)).not.toBeInTheDocument();
      });
    });
  });
});
