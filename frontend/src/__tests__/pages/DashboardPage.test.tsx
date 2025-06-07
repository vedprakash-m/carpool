import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import DashboardPage from "../../app/dashboard/page";
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

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CalendarIcon: () => <svg data-testid="calendar-icon" />,
  TruckIcon: () => <svg data-testid="truck-icon" />,
  UserGroupIcon: () => <svg data-testid="usergroup-icon" />,
  CurrencyDollarIcon: () => <svg data-testid="currency-icon" />,
  ClockIcon: () => <svg data-testid="clock-icon" />,
  MapPinIcon: () => <svg data-testid="mappin-icon" />,
  AcademicCapIcon: () => <svg data-testid="academic-icon" />,
  HomeIcon: () => <svg data-testid="home-icon" />,
  ChartBarIcon: () => <svg data-testid="chart-icon" />,
}));

describe("DashboardPage", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: "/dashboard",
    query: {},
    asPath: "/dashboard",
  };

  const mockUser = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    role: "parent",
    schoolDomain: "lincolnelementary.edu",
  };

  const mockStats = {
    weeklySchoolTrips: 8,
    childrenCount: 2,
    monthlyFuelSavings: 45.5,
    timeSavedHours: 12,
    upcomingTrips: 3,
    totalTrips: 25,
    costSavings: 125.75,
  };

  const mockAuthStore = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    logout: jest.fn(),
  };

  const mockTripStore = {
    stats: mockStats,
    loading: false,
    fetchTripStats: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);
    (useTripStore as jest.Mock).mockReturnValue(mockTripStore);
    jest.clearAllMocks();
  });

  describe("Authentication and User Context", () => {
    it("should render dashboard when user is authenticated", () => {
      render(<DashboardPage />);

      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(
        screen.getByText(`Good morning, ${mockUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should not render dashboard content when user is not authenticated", () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
        user: null,
      });

      const { container } = render(<DashboardPage />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render dashboard content when user is missing", () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: null,
      });

      const { container } = render(<DashboardPage />);
      expect(container.firstChild).toBeNull();
    });

    it("should fetch trip stats when authenticated", () => {
      render(<DashboardPage />);

      expect(mockTripStore.fetchTripStats).toHaveBeenCalledTimes(1);
    });

    it("should not fetch trip stats when not authenticated", () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
      });

      render(<DashboardPage />);

      expect(mockTripStore.fetchTripStats).not.toHaveBeenCalled();
    });
  });

  describe("Welcome Section and School Focus", () => {
    it("should display personalized welcome message", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${mockUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should show school run information", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText(/2 school runs.*scheduled for tomorrow/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/all pickups confirmed/i)).toBeInTheDocument();
    });

    it("should display academic cap icon for school focus", () => {
      render(<DashboardPage />);

      expect(screen.getByTestId("academic-icon")).toBeInTheDocument();
    });

    it("should use proper styling for welcome section", () => {
      render(<DashboardPage />);

      const welcomeSection = screen
        .getByText(`Good morning, ${mockUser.firstName}! 👋`)
        .closest("div");
      expect(welcomeSection).toHaveClass(
        "bg-gradient-to-r",
        "from-blue-50",
        "to-indigo-50"
      );
    });
  });

  describe("School Statistics Display", () => {
    it("should display weekly school trips statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("This Week's School Runs")).toBeInTheDocument();
      expect(
        screen.getByText(mockStats.weeklySchoolTrips.toString())
      ).toBeInTheDocument();
      expect(screen.getByText("Morning + afternoon trips")).toBeInTheDocument();
    });

    it("should display children count statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Children in Carpool")).toBeInTheDocument();
      expect(
        screen.getByText(mockStats.childrenCount.toString())
      ).toBeInTheDocument();
      expect(screen.getByText("Active student profiles")).toBeInTheDocument();
    });

    it("should display monthly fuel savings with currency formatting", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Monthly Fuel Savings")).toBeInTheDocument();
      expect(
        screen.getByText(`$${mockStats.monthlyFuelSavings.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(screen.getByText("vs. driving alone")).toBeInTheDocument();
    });

    it("should display time saved statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Time Saved This Month")).toBeInTheDocument();
      expect(
        screen.getByText(`${mockStats.timeSavedHours}h`)
      ).toBeInTheDocument();
      expect(screen.getByText("from coordinated pickups")).toBeInTheDocument();
    });

    it("should show loading state for statistics", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        loading: true,
        stats: null,
      });

      render(<DashboardPage />);

      expect(screen.getAllByText("...")).toHaveLength(4); // One for each stat
    });

    it("should handle missing stats gracefully", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        stats: null,
      });

      render(<DashboardPage />);

      expect(screen.getByText("0")).toBeInTheDocument(); // Default values
      expect(screen.getByText("$0.00")).toBeInTheDocument();
      expect(screen.getByText("0h")).toBeInTheDocument();
    });
  });

  describe("School-Specific Quick Actions", () => {
    it("should display schedule school run action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Schedule School Run")).toBeInTheDocument();
      expect(
        screen.getByText("Create morning or afternoon school trip")
      ).toBeInTheDocument();
    });

    it("should display find school carpool action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Find School Carpool")).toBeInTheDocument();
      expect(
        screen.getByText("Join existing school trips in your area")
      ).toBeInTheDocument();
    });

    it("should display weekly preferences action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Weekly Preferences")).toBeInTheDocument();
      expect(
        screen.getByText("Submit your weekly driving preferences")
      ).toBeInTheDocument();
    });

    it("should display manage children action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Manage Children")).toBeInTheDocument();
      expect(
        screen.getByText("Add or edit student profiles")
      ).toBeInTheDocument();
    });

    it("should navigate to create trip with school type when clicked", () => {
      render(<DashboardPage />);

      const scheduleButton = screen
        .getByText("Schedule School Run")
        .closest("button");
      fireEvent.click(scheduleButton!);

      expect(mockRouter.push).toHaveBeenCalledWith("/trips/create?type=school");
    });

    it("should navigate to trip search with school filter when clicked", () => {
      render(<DashboardPage />);

      const findButton = screen
        .getByText("Find School Carpool")
        .closest("button");
      fireEvent.click(findButton!);

      expect(mockRouter.push).toHaveBeenCalledWith("/trips?filter=school");
    });

    it("should navigate to preferences page when clicked", () => {
      render(<DashboardPage />);

      const preferencesButton = screen
        .getByText("Weekly Preferences")
        .closest("button");
      fireEvent.click(preferencesButton!);

      expect(mockRouter.push).toHaveBeenCalledWith("/parents/preferences");
    });

    it("should navigate to children management when clicked", () => {
      render(<DashboardPage />);

      const childrenButton = screen
        .getByText("Manage Children")
        .closest("button");
      fireEvent.click(childrenButton!);

      expect(mockRouter.push).toHaveBeenCalledWith("/family/children");
    });
  });

  describe("Upcoming School Trips Section", () => {
    it("should display upcoming school trips header", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Today's School Schedule")).toBeInTheDocument();
    });

    it("should display morning drop-off trip details", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Morning Drop-off")).toBeInTheDocument();
      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
      expect(screen.getByText("7:45 AM")).toBeInTheDocument();
      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    });

    it("should display afternoon pickup trip details", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Afternoon Pickup")).toBeInTheDocument();
      expect(screen.getByText("3:15 PM")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
    });

    it("should show trip status indicators", () => {
      render(<DashboardPage />);

      expect(screen.getByText("✓ Confirmed")).toBeInTheDocument();
      expect(screen.getByText("🚗 You're driving")).toBeInTheDocument();
    });

    it("should display children names in trips", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Emma, Jake")).toBeInTheDocument();
      expect(screen.getByText("Emma")).toBeInTheDocument();
    });

    it("should show passenger information for driving trips", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText("Tom (Grade 3), Lisa (Grade 2)")
      ).toBeInTheDocument();
    });
  });

  describe("Family Efficiency Metrics", () => {
    it("should display weekly efficiency metrics", () => {
      render(<DashboardPage />);

      expect(screen.getByText("This Week's Impact")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument(); // trips coordinated
      expect(screen.getByText("45 miles")).toBeInTheDocument(); // miles shared
      expect(screen.getByText("12 lbs")).toBeInTheDocument(); // CO2 saved
      expect(screen.getByText("$3.25")).toBeInTheDocument(); // cost per trip
    });

    it("should display community connection metrics", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Community Connection")).toBeInTheDocument();
      expect(screen.getByText("98%")).toBeInTheDocument(); // reliability score
      expect(screen.getByText("6")).toBeInTheDocument(); // families connected
      expect(screen.getByText("2")).toBeInTheDocument(); // emergency pickups
      expect(screen.getByText("⭐ 4.8/5")).toBeInTheDocument(); // rating
    });

    it("should use proper icons for metric sections", () => {
      render(<DashboardPage />);

      expect(screen.getByTestId("chart-icon")).toBeInTheDocument();
      expect(screen.getByTestId("usergroup-icon")).toBeInTheDocument();
    });
  });

  describe("Section Error Boundaries", () => {
    it("should wrap statistics in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-school-statistics")
      ).toBeInTheDocument();
    });

    it("should wrap quick actions in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-school-quick-actions")
      ).toBeInTheDocument();
    });

    it("should wrap upcoming trips in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-upcoming-school-trips")
      ).toBeInTheDocument();
    });

    it("should wrap efficiency metrics in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-family-efficiency-metrics")
      ).toBeInTheDocument();
    });
  });

  describe("Responsive Design and Layout", () => {
    it("should use responsive grid layouts", () => {
      const { container } = render(<DashboardPage />);

      const gridElements = container.querySelectorAll('[class*="grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it("should have proper spacing between sections", () => {
      const { container } = render(<DashboardPage />);

      const spacedElements = container.querySelectorAll('[class*="space-y"]');
      expect(spacedElements.length).toBeGreaterThan(0);
    });

    it("should use shadow and rounded corners for cards", () => {
      const { container } = render(<DashboardPage />);

      const shadowElements = container.querySelectorAll('[class*="shadow"]');
      const roundedElements = container.querySelectorAll('[class*="rounded"]');

      expect(shadowElements.length).toBeGreaterThan(0);
      expect(roundedElements.length).toBeGreaterThan(0);
    });
  });

  describe("Performance and Error Handling", () => {
    it("should render without errors", () => {
      expect(() => render(<DashboardPage />)).not.toThrow();
    });

    it("should handle different user roles appropriately", () => {
      const studentUser = { ...mockUser, role: "student" };
      (useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: studentUser,
      });

      render(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${studentUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should handle missing trip stats gracefully", () => {
      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        stats: undefined,
      });

      expect(() => render(<DashboardPage />)).not.toThrow();
    });

    it("should handle fetchTripStats errors gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      (useTripStore as jest.Mock).mockReturnValue({
        ...mockTripStore,
        fetchTripStats: jest.fn().mockRejectedValue(new Error("API Error")),
      });

      expect(() => render(<DashboardPage />)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("VCarpool Business Logic Integration", () => {
    it("should display school-specific terminology throughout", () => {
      render(<DashboardPage />);

      expect(screen.getByText(/school runs/i)).toBeInTheDocument();
      expect(screen.getByText(/school carpool/i)).toBeInTheDocument();
      expect(screen.getByText(/children/i)).toBeInTheDocument();
      expect(screen.getByText(/parent/i)).toBeInTheDocument();
    });

    it("should focus on family and school community aspects", () => {
      render(<DashboardPage />);

      expect(screen.getByText(/family/i)).toBeInTheDocument();
      expect(screen.getByText(/community/i)).toBeInTheDocument();
      expect(screen.getByText(/parents/i)).toBeInTheDocument();
      expect(screen.getByText(/students/i)).toBeInTheDocument();
    });

    it("should emphasize cost savings and efficiency", () => {
      render(<DashboardPage />);

      expect(screen.getByText(/fuel savings/i)).toBeInTheDocument();
      expect(screen.getByText(/time saved/i)).toBeInTheDocument();
      expect(screen.getByText(/cost/i)).toBeInTheDocument();
      expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
    });
  });
});
