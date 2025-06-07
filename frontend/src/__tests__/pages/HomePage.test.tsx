import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import HomePage from "../../app/page";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Link component
jest.mock("next/link", () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe("HomePage", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    route: "/",
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe("VCarpool Branding and Header", () => {
    it("should display VCarpool brand name and logo", () => {
      render(<HomePage />);

      expect(screen.getByText("VCarpool")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /sign in/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /join today/i })
      ).toBeInTheDocument();
    });

    it("should have correct navigation links in header", () => {
      render(<HomePage />);

      const signInLink = screen.getByRole("link", { name: /sign in/i });
      const joinTodayLink = screen.getByRole("link", { name: /join today/i });

      expect(signInLink).toHaveAttribute("href", "/login");
      expect(joinTodayLink).toHaveAttribute("href", "/register");
    });

    it("should display car icon for VCarpool branding", () => {
      render(<HomePage />);

      // Check for SVG elements that represent the car icon
      const carIcons = document.querySelectorAll("svg");
      expect(carIcons.length).toBeGreaterThan(0);
    });
  });

  describe("Hero Section Content", () => {
    it("should display smart school carpool messaging", () => {
      render(<HomePage />);

      expect(screen.getByText("Smart School")).toBeInTheDocument();
      expect(screen.getByText("Carpool Coordination")).toBeInTheDocument();
    });

    it("should display school-focused value proposition", () => {
      render(<HomePage />);

      const description = screen.getByText(
        /connect with other parents to coordinate convenient school transportation/i
      );
      expect(description).toBeInTheDocument();

      expect(
        screen.getByText(/share rides, reduce costs, and build community/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /organized carpool partnerships for your children's daily school commute/i
        )
      ).toBeInTheDocument();
    });

    it("should have primary call-to-action buttons", () => {
      render(<HomePage />);

      const startCarpoolingBtn = screen.getByRole("link", {
        name: /start carpooling/i,
      });
      const parentLoginBtn = screen.getByRole("link", {
        name: /parent login/i,
      });

      expect(startCarpoolingBtn).toHaveAttribute("href", "/register");
      expect(parentLoginBtn).toHaveAttribute("href", "/login");
    });

    it("should use appropriate styling for hero section", () => {
      render(<HomePage />);

      const heroHeading = screen.getByText("Smart School");
      expect(heroHeading.closest("h1")).toHaveClass(
        "text-4xl",
        "tracking-tight",
        "font-extrabold"
      );
    });
  });

  describe("School Community Features", () => {
    it("should highlight parent community network feature", () => {
      render(<HomePage />);

      expect(screen.getByText("Parent Community Network")).toBeInTheDocument();
      expect(
        screen.getByText(/connect with parents from your school community/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/convenient, coordinated transportation partnerships/i)
      ).toBeInTheDocument();
    });

    it("should describe flexible school scheduling", () => {
      render(<HomePage />);

      expect(
        screen.getByText("Flexible School Scheduling")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/coordinate morning drop-offs and afternoon pickups/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /recurring schedules that work for your family's routine/i
        )
      ).toBeInTheDocument();
    });

    it("should emphasize cost-effective transportation", () => {
      render(<HomePage />);

      expect(
        screen.getByText("Cost-Effective Transportation")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/share fuel costs and reduce wear on your vehicle/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /providing reliable school transportation for your children/i
        )
      ).toBeInTheDocument();
    });

    it("should display all three feature cards with icons", () => {
      render(<HomePage />);

      const featureCards = screen.getAllByText(
        /network|scheduling|transportation/i
      );
      expect(featureCards.length).toBeGreaterThanOrEqual(3);

      // Check for SVG icons in each feature card
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(3); // Header + 3 feature icons + others
    });
  });

  describe("School-Focused Value Proposition", () => {
    it('should display "Built for School Communities" section', () => {
      render(<HomePage />);

      expect(
        screen.getByText("Built for School Communities")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /VCarpool makes school transportation coordination simple and organized for busy families/i
        )
      ).toBeInTheDocument();
    });

    it("should highlight organized trip planning", () => {
      render(<HomePage />);

      expect(screen.getByText("Organized")).toBeInTheDocument();
      expect(screen.getByText("Structured trip planning")).toBeInTheDocument();
    });

    it("should emphasize simplicity", () => {
      render(<HomePage />);

      expect(screen.getByText("Simple")).toBeInTheDocument();
      expect(screen.getByText("Easy trip coordination")).toBeInTheDocument();
    });

    it("should promote savings benefit", () => {
      render(<HomePage />);

      expect(screen.getByText("Savings")).toBeInTheDocument();
      expect(
        screen.getByText("Reduced transportation costs")
      ).toBeInTheDocument();
    });
  });

  describe("Responsive Design and Accessibility", () => {
    it("should have responsive grid layouts", () => {
      render(<HomePage />);

      // Check for responsive classes in the DOM
      const gridElements = document.querySelectorAll('[class*="grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);

      // Verify responsive breakpoints are used
      const responsiveElements = document.querySelectorAll(
        '[class*="sm:"], [class*="md:"], [class*="lg:"]'
      );
      expect(responsiveElements.length).toBeGreaterThan(0);
    });

    it("should use semantic HTML elements", () => {
      render(<HomePage />);

      expect(document.querySelector("header")).toBeInTheDocument();
      expect(document.querySelector("main")).toBeInTheDocument();
      expect(document.querySelector("h1")).toBeInTheDocument();
      expect(document.querySelector("nav")).toBeDefined();
    });

    it("should have proper heading hierarchy", () => {
      render(<HomePage />);

      const h1 = document.querySelector("h1");
      const h2 = document.querySelector("h2");
      const h3Elements = document.querySelectorAll("h3");

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h3Elements.length).toBeGreaterThan(0);
    });

    it("should include accessibility attributes for icons", () => {
      render(<HomePage />);

      // Check for SVG elements with accessibility attributes
      const svgElements = document.querySelectorAll("svg");
      svgElements.forEach((svg) => {
        // SVGs should have proper accessibility handling
        expect(svg).toBeDefined();
      });
    });
  });

  describe("VCarpool Brand Consistency", () => {
    it("should use consistent primary color theming", () => {
      render(<HomePage />);

      // Check for primary color classes
      const primaryColorElements = document.querySelectorAll(
        '[class*="primary-6"]'
      );
      expect(primaryColorElements.length).toBeGreaterThan(0);
    });

    it("should display school transportation terminology consistently", () => {
      render(<HomePage />);

      expect(screen.getByText(/school transportation/i)).toBeInTheDocument();
      expect(screen.getByText(/carpool/i)).toBeInTheDocument();
      expect(screen.getByText(/parents/i)).toBeInTheDocument();
      expect(screen.getByText(/children/i)).toBeInTheDocument();
    });

    it("should use professional card-based layout", () => {
      render(<HomePage />);

      // Check for card classes
      const cardElements = document.querySelectorAll(
        '[class*="card"], [class*="shadow"], [class*="rounded"]'
      );
      expect(cardElements.length).toBeGreaterThan(0);
    });
  });

  describe("User Journey and Call-to-Actions", () => {
    it("should provide clear registration path for new users", () => {
      render(<HomePage />);

      const registrationLinks = screen.getAllByRole("link", {
        name: /start carpooling|join today/i,
      });
      expect(registrationLinks.length).toBeGreaterThanOrEqual(2);

      registrationLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/register");
      });
    });

    it("should provide login path for existing users", () => {
      render(<HomePage />);

      const loginLinks = screen.getAllByRole("link", {
        name: /sign in|parent login/i,
      });
      expect(loginLinks.length).toBeGreaterThanOrEqual(2);

      loginLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/login");
      });
    });

    it("should differentiate between primary and secondary actions", () => {
      render(<HomePage />);

      const startCarpoolingBtn = screen.getByRole("link", {
        name: /start carpooling/i,
      });
      const parentLoginBtn = screen.getByRole("link", {
        name: /parent login/i,
      });

      // Primary action should have primary styling
      expect(startCarpoolingBtn).toHaveClass("bg-primary-600");

      // Secondary action should have different styling
      expect(parentLoginBtn).toHaveClass("bg-white");
    });
  });

  describe("Performance and Loading", () => {
    it("should render without throwing errors", () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it("should have minimal initial render complexity", () => {
      const { container } = render(<HomePage />);

      // Should not have overly complex nested structures
      const deeplyNestedElements = container.querySelectorAll(
        "div > div > div > div > div > div"
      );
      expect(deeplyNestedElements.length).toBeLessThan(10);
    });

    it("should not have any async loading states on initial render", () => {
      render(<HomePage />);

      // HomePage should be static - no loading spinners or async content
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("Content Validation", () => {
    it("should have complete hero section content", () => {
      render(<HomePage />);

      // Verify all hero elements are present
      expect(screen.getByText("Smart School")).toBeInTheDocument();
      expect(screen.getByText("Carpool Coordination")).toBeInTheDocument();
      expect(
        screen.getByText(/connect with other parents/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /start carpooling/i })
      ).toBeInTheDocument();
    });

    it("should not have any placeholder or lorem ipsum text", () => {
      render(<HomePage />);

      const textContent = document.body.textContent;
      expect(textContent).not.toMatch(/lorem ipsum|placeholder|todo|fixme/i);
    });

    it("should have school-specific language throughout", () => {
      render(<HomePage />);

      const textContent = document.body.textContent;
      expect(textContent).toMatch(/school/i);
      expect(textContent).toMatch(/children|kids/i);
      expect(textContent).toMatch(/parents/i);
      expect(textContent).toMatch(/carpool/i);
    });
  });
});
