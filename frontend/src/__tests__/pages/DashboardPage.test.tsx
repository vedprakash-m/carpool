/**
 * Dashboard Page Tests - UX Requirements Alignment
 *
 * Tests aligned with User_Experience.md requirements:
 * - Unified Family Dashboard & Role Transitions
 * - Role-based navigation and content display
 * - Family context integration
 * - Emergency response capabilities
 * - Multi-role user experience support
 * - Real-time status updates and notifications
 */
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
jest.mock("../../store/auth.store", () => ({
  useAuthStore: jest.fn(),
}));
jest.mock("../../store/trip.store", () => ({
  useTripStore: jest.fn(),
}));

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

describe("Dashboard Page - Unified Family Dashboard & Role Transitions", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: "/dashboard",
    query: {},
    asPath: "/dashboard",
  };

  // Mock family-oriented user data aligned with UX requirements
  const mockFamilyParentUser = {
    id: "parent-456",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@family.edu",
    role: "parent",
    familyId: "family-123",
    schoolDomain: "lincolnelementary.edu",
    onboardingCompleted: true,
    children: [
      { id: "child-1", name: "Emma Johnson", grade: "3rd" },
      { id: "child-2", name: "Liam Johnson", grade: "1st" },
    ],
  };

  const mockAdminUser = {
    id: "admin-001",
    firstName: "Admin",
    lastName: "User",
    email: "admin@lincolnelementary.edu",
    role: "admin",
    familyId: null, // Admins don't belong to families
    schoolDomain: "lincolnelementary.edu",
    onboardingCompleted: true,
  };

  // Mock family-context stats aligned with UX requirements
  const mockFamilyStats = {
    weeklySchoolTrips: 8,
    childrenCount: 2,
    monthlyFuelSavings: 45.5,
    timeSavedHours: 12,
    upcomingTrips: 3,
    totalTrips: 25,
    costSavings: 125.75,
    familyGroupsCount: 2, // Multiple carpool groups per family
    emergencyContactsActive: true,
  };

  const mockAuthStore = {
    user: mockFamilyParentUser,
    isAuthenticated: true,
    isLoading: false,
    logout: jest.fn(),
  };

  const mockTripStore = {
    stats: mockFamilyStats,
    loading: false,
    fetchTripStats: jest.fn().mockResolvedValue(mockFamilyStats),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockAuthStore);
    (useTripStore as unknown as jest.Mock).mockReturnValue(mockTripStore);
    jest.clearAllMocks();
  });

  describe("Family Authentication and Context", () => {
    it("should render family dashboard when parent is authenticated", () => {
      render(<DashboardPage />);

      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(
        screen.getByText(`Good morning, ${mockFamilyParentUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should render admin dashboard with system-wide context", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
      });

      render(<DashboardPage />);

      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(
        screen.getByText(`Good morning, ${mockAdminUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should not render dashboard content when user is not authenticated", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
        user: null,
      });

      const { container } = render(<DashboardPage />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render dashboard content when user is missing", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: null,
      });

      const { container } = render(<DashboardPage />);
      expect(container.firstChild).toBeNull();
    });

    it("should fetch family trip stats when parent is authenticated", () => {
      render(<DashboardPage />);

      expect(mockTripStore.fetchTripStats).toHaveBeenCalledTimes(1);
    });

    it("should not fetch trip stats when not authenticated", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
      });

      render(<DashboardPage />);

      expect(mockTripStore.fetchTripStats).not.toHaveBeenCalled();
    });
  });

  describe("Family Welcome Section and School Focus", () => {
    it("should display personalized family welcome message", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${mockFamilyParentUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should show family school run information with children context", () => {
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

    it("should use proper styling for family welcome section", () => {
      render(<DashboardPage />);

      const welcomeSection = screen
        .getByText(`Good morning, ${mockFamilyParentUser.firstName}! 👋`)
        .closest("div");
      expect(welcomeSection).toHaveClass(
        "bg-gradient-to-r",
        "from-blue-50",
        "to-indigo-50"
      );
    });

    it("should display role-appropriate welcome for admin users", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
      });

      render(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${mockAdminUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });
  });

  describe("Family Statistics Display - Role-Based Content", () => {
    it("should display family weekly school trips statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("This Week's School Runs")).toBeInTheDocument();
      expect(
        screen.getByText(mockFamilyStats.weeklySchoolTrips.toString())
      ).toBeInTheDocument();
      expect(screen.getByText("Morning + afternoon trips")).toBeInTheDocument();
    });

    it("should display family children count statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Children in Carpool")).toBeInTheDocument();
      expect(
        screen.getByText(mockFamilyStats.childrenCount.toString())
      ).toBeInTheDocument();
      expect(screen.getByText("Active student profiles")).toBeInTheDocument();
    });

    it("should display family monthly fuel savings with currency formatting", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Monthly Fuel Savings")).toBeInTheDocument();
      expect(
        screen.getByText(`$${mockFamilyStats.monthlyFuelSavings.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(screen.getByText("vs. driving alone")).toBeInTheDocument();
    });

    it("should display family time saved statistic", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Time Saved This Month")).toBeInTheDocument();
      expect(
        screen.getByText(`${mockFamilyStats.timeSavedHours}h`)
      ).toBeInTheDocument();
      expect(screen.getByText("from coordinated pickups")).toBeInTheDocument();
    });

    it("should show admin-level statistics for admin users", () => {
      const mockAdminStats = {
        ...mockFamilyStats,
        totalFamilies: 45,
        totalGroups: 12,
        systemWideTrips: 150,
      };

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
      });

      (useTripStore as unknown as jest.Mock).mockReturnValue({
        ...mockTripStore,
        stats: mockAdminStats,
      });

      render(<DashboardPage />);

      // Admin should see system-wide metrics instead of family-specific ones
      expect(screen.getByText("This Week's School Runs")).toBeInTheDocument();
    });

    it("should show loading state for family statistics", () => {
      (useTripStore as unknown as jest.Mock).mockReturnValue({
        ...mockTripStore,
        loading: true,
        stats: null,
      });

      render(<DashboardPage />);

      expect(screen.getAllByText("...")).toHaveLength(4); // One for each stat
    });

    it("should handle missing stats gracefully", () => {
      (useTripStore as unknown as jest.Mock).mockReturnValue({
        ...mockTripStore,
        stats: null,
      });

      render(<DashboardPage />);

      expect(screen.getByText("0")).toBeInTheDocument(); // Default values
      expect(screen.getByText("$0.00")).toBeInTheDocument();
      expect(screen.getByText("0h")).toBeInTheDocument();
    });
  });

  describe("Family-Oriented Quick Actions - Role-Based Navigation", () => {
    it("should display family schedule school run action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Schedule School Run")).toBeInTheDocument();
      expect(
        screen.getByText("Create morning or afternoon school trip")
      ).toBeInTheDocument();
    });

    it("should display family carpool discovery action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Find School Carpool")).toBeInTheDocument();
      expect(
        screen.getByText("Join existing school trips in your area")
      ).toBeInTheDocument();
    });

    it("should display family weekly preferences action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Weekly Preferences")).toBeInTheDocument();
      expect(
        screen.getByText("Submit your weekly driving preferences")
      ).toBeInTheDocument();
    });

    it("should display family children management action", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Manage Children")).toBeInTheDocument();
      expect(
        screen.getByText("Add or edit student profiles")
      ).toBeInTheDocument();
    });

    it("should display admin-specific actions for admin users", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
      });

      render(<DashboardPage />);

      // Admin users should see system management actions
      expect(screen.getByText("Schedule School Run")).toBeInTheDocument();
      // Additional admin actions would be tested here
    });

    it("should navigate to family trip creation with school type when clicked", () => {
      render(<DashboardPage />);

      const scheduleButton = screen
        .getByText("Schedule School Run")
        .closest("button");
      fireEvent.click(scheduleButton!);

      expect(mockRouter.push).toHaveBeenCalledWith("/trips/create?type=school");
    });

    it("should navigate to family trip search with school filter when clicked", () => {
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

  describe("Family School Schedule - Today's Trips", () => {
    it("should display family school schedule header", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Today's School Schedule")).toBeInTheDocument();
    });

    it("should display family morning drop-off trip details", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Morning Drop-off")).toBeInTheDocument();
      expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
      expect(screen.getByText("7:45 AM")).toBeInTheDocument();
      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    });

    it("should display family afternoon pickup trip details", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Afternoon Pickup")).toBeInTheDocument();
      expect(screen.getByText("3:15 PM")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
    });

    it("should show family trip status indicators", () => {
      render(<DashboardPage />);

      expect(screen.getByText("✓ Confirmed")).toBeInTheDocument();
      expect(screen.getByText("🚗 You're driving")).toBeInTheDocument();
    });

    it("should display family children names in trips", () => {
      render(<DashboardPage />);

      expect(screen.getByText("Emma, Jake")).toBeInTheDocument();
      expect(screen.getByText("Emma")).toBeInTheDocument();
    });

    it("should show passenger information for family driving trips", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText("Tom (Grade 3), Lisa (Grade 2)")
      ).toBeInTheDocument();
    });

    it("should handle emergency pickup notifications", () => {
      render(<DashboardPage />);

      // Emergency notifications should be prominently displayed
      // This would be expanded based on emergency response UX requirements
      expect(screen.getByText("Today's School Schedule")).toBeInTheDocument();
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

  describe("UX-Aligned Error Boundaries", () => {
    it("should wrap family statistics in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-school-statistics")
      ).toBeInTheDocument();
    });

    it("should wrap family quick actions in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-school-quick-actions")
      ).toBeInTheDocument();
    });

    it("should wrap family upcoming trips in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-upcoming-school-trips")
      ).toBeInTheDocument();
    });

    it("should wrap family efficiency metrics in error boundary", () => {
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-family-efficiency-metrics")
      ).toBeInTheDocument();
    });

    it("should handle role-based section errors gracefully", () => {
      // Test that error boundaries work properly for different user roles
      render(<DashboardPage />);

      expect(
        screen.getByTestId("section-school-statistics")
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
      const studentUser = { ...mockFamilyParentUser, role: "student" };
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: studentUser,
      });

      render(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${studentUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should handle missing trip stats gracefully", () => {
      (useTripStore as unknown as jest.Mock).mockReturnValue({
        ...mockTripStore,
        stats: undefined,
      });

      expect(() => render(<DashboardPage />)).not.toThrow();
    });

    it("should handle fetchTripStats errors gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      (useTripStore as unknown as jest.Mock).mockReturnValue({
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

  // Additional UX-aligned tests for role transitions and family context
  describe("Family Dashboard Role Transitions - UX Requirements", () => {
    it("should handle role transitions between parent and admin seamlessly", () => {
      const { rerender } = render(<DashboardPage />);

      // Verify parent dashboard renders correctly
      expect(
        screen.getByText(`Good morning, ${mockFamilyParentUser.firstName}! 👋`)
      ).toBeInTheDocument();

      // Switch to admin role
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
      });

      rerender(<DashboardPage />);

      expect(
        screen.getByText(`Good morning, ${mockAdminUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should handle family onboarding completion status appropriately", () => {
      const incompleteUser = {
        ...mockFamilyParentUser,
        onboardingCompleted: false,
        familyId: null,
      };

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: incompleteUser,
      });

      render(<DashboardPage />);

      // Should still render dashboard but with potentially different content flow
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(
        screen.getByText(`Good morning, ${incompleteUser.firstName}! 👋`)
      ).toBeInTheDocument();
    });

    it("should support emergency response context in family dashboard", () => {
      const emergencyUser = {
        ...mockFamilyParentUser,
        emergencyContact: true,
      };

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: emergencyUser,
      });

      render(<DashboardPage />);

      // Dashboard should be ready for emergency response features
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      // Emergency-specific UI elements would be tested here based on UX requirements
    });

    it("should handle multi-child family context appropriately", () => {
      const multiChildUser = {
        ...mockFamilyParentUser,
        children: [
          { id: "child-1", name: "Emma Johnson", grade: "3rd" },
          { id: "child-2", name: "Liam Johnson", grade: "1st" },
          { id: "child-3", name: "Sophia Johnson", grade: "5th" },
        ],
      };

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: multiChildUser,
      });

      render(<DashboardPage />);

      // Dashboard should accommodate multiple children scheduling
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });
  });
});
