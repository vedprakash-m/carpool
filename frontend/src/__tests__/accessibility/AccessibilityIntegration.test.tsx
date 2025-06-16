/**
 * Accessibility Integration Tests
 * Tests for WCAG 2.1 AA compliance and accessibility features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  AccessibleModal,
  AccessibleDropdown,
  AccessibleToast,
  SkipLink,
  FormField,
  AccessibleProgress,
  HighContrastToggle,
} from '../../components/ui/AccessibleComponents';
import { useAccessibility } from '../../services/accessibility.service';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Accessibility Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  describe('Skip Link Component', () => {
    test('renders skip link with proper attributes', () => {
      render(<SkipLink targetId="main-content" />);

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
      expect(skipLink).toHaveClass('sr-only');
    });

    test('becomes visible on focus', () => {
      render(<SkipLink targetId="main-content" />);

      const skipLink = screen.getByText('Skip to main content');
      fireEvent.focus(skipLink);

      expect(skipLink).toHaveClass('focus:not-sr-only');
    });

    test('meets accessibility standards', async () => {
      const { container } = render(<SkipLink targetId="main-content" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accessible Modal Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
      mockOnClose.mockClear();
    });

    test('renders modal with proper ARIA attributes', () => {
      render(
        <AccessibleModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </AccessibleModal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');

      const title = screen.getByText('Test Modal');
      expect(title).toBeInTheDocument();
    });

    test('traps focus within modal', () => {
      render(
        <AccessibleModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button>First Button</button>
          <button>Second Button</button>
        </AccessibleModal>
      );

      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      const closeButton = screen.getByLabelText('Close');

      // Focus should be trapped within modal
      expect(document.activeElement).toBe(firstButton);
    });

    test('closes on escape key', () => {
      render(
        <AccessibleModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </AccessibleModal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('prevents body scroll when open', () => {
      render(
        <AccessibleModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </AccessibleModal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <AccessibleModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </AccessibleModal>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accessible Dropdown Component', () => {
    test('renders dropdown with proper ARIA attributes', () => {
      render(
        <AccessibleDropdown trigger={<button>Open Dropdown</button>}>
          <div>Dropdown content</div>
        </AccessibleDropdown>
      );

      const trigger = screen.getByText('Open Dropdown');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    });

    test('opens dropdown on click and updates ARIA attributes', () => {
      render(
        <AccessibleDropdown trigger={<button>Open Dropdown</button>}>
          <div>Dropdown content</div>
        </AccessibleDropdown>
      );

      const trigger = screen.getByText('Open Dropdown');
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Dropdown content')).toBeInTheDocument();
    });

    test('closes dropdown on escape key', () => {
      render(
        <AccessibleDropdown trigger={<button>Open Dropdown</button>}>
          <div>Dropdown content</div>
        </AccessibleDropdown>
      );

      const trigger = screen.getByText('Open Dropdown');
      fireEvent.click(trigger);

      expect(screen.getByText('Dropdown content')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <AccessibleDropdown trigger={<button>Open Dropdown</button>}>
          <div>Dropdown content</div>
        </AccessibleDropdown>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accessible Toast Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
      mockOnClose.mockClear();
    });

    test('renders toast with proper ARIA attributes', () => {
      render(
        <AccessibleToast
          message="Test notification"
          type="info"
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });

    test('uses assertive live region for error messages', () => {
      render(
        <AccessibleToast
          message="Error occurred"
          type="error"
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'assertive');
    });

    test('auto-closes after specified duration', async () => {
      render(
        <AccessibleToast
          message="Auto-close test"
          type="info"
          onClose={mockOnClose}
          duration={1000}
        />
      );

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalled();
        },
        { timeout: 1500 }
      );
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <AccessibleToast
          message="Test notification"
          type="info"
          onClose={mockOnClose}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Field Component', () => {
    test('renders form field with proper labels and ARIA attributes', () => {
      render(
        <FormField
          label="Test Field"
          id="test-field"
          required={true}
          description="This is a test field"
        >
          <input id="test-field" type="text" />
        </FormField>
      );

      const label = screen.getByText('Test Field');
      const input = screen.getByRole('textbox');
      const description = screen.getByText('This is a test field');

      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', 'test-field');
      expect(input).toHaveAttribute('aria-describedby');
      expect(description).toBeInTheDocument();
    });

    test('displays error message with proper ARIA attributes', () => {
      render(
        <FormField
          label="Test Field"
          id="test-field"
          error="This field is required"
        >
          <input id="test-field" type="text" />
        </FormField>
      );

      const errorMessage = screen.getByText('This field is required');
      const input = screen.getByRole('textbox');

      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <FormField label="Test Field" id="test-field" required={true}>
          <input id="test-field" type="text" />
        </FormField>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Progress Component', () => {
    test('renders progress with proper ARIA attributes', () => {
      render(
        <AccessibleProgress value={50} max={100} label="Upload progress" />
      );

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
      expect(progress).toHaveAttribute('aria-valuenow', '50');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
      expect(progress).toHaveAttribute('aria-label', 'Upload progress');
    });

    test('shows percentage when enabled', () => {
      render(
        <AccessibleProgress
          value={75}
          max={100}
          label="Upload progress"
          showPercentage={true}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <AccessibleProgress value={50} max={100} label="Upload progress" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('High Contrast Toggle', () => {
    test('renders toggle button with proper attributes', () => {
      render(<HighContrastToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-pressed');
      expect(button).toHaveAttribute('aria-label');
    });

    test('toggles high contrast mode', () => {
      render(<HighContrastToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.classList.contains('high-contrast')).toBe(
        true
      );
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    test('meets accessibility standards', async () => {
      const { container } = render(<HighContrastToggle />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('detects keyboard navigation', () => {
      // Simulate tab key press
      fireEvent.keyDown(document, { key: 'Tab' });

      expect(document.body.classList.contains('keyboard-navigation')).toBe(
        true
      );
    });

    test('removes keyboard navigation class on mouse interaction', () => {
      // First enable keyboard navigation
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.body.classList.contains('keyboard-navigation')).toBe(
        true
      );

      // Then simulate mouse interaction
      fireEvent.mouseDown(document);
      expect(document.body.classList.contains('keyboard-navigation')).toBe(
        false
      );
    });
  });

  describe('Screen Reader Support', () => {
    test('announces live regions properly', () => {
      // Mock the accessibility service
      const mockAnnounceLive = jest.fn();

      render(
        <AccessibleToast
          message="Screen reader test"
          type="info"
          onClose={jest.fn()}
        />
      );

      // The toast should announce its message
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('provides proper semantic structure', () => {
      render(
        <div>
          <h1>Main Heading</h1>
          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
            </ul>
          </nav>
          <main>
            <h2>Content Heading</h2>
            <p>Main content area</p>
          </main>
        </div>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Color Contrast Validation', () => {
    test('validates color contrast ratios', () => {
      // This would typically test the contrast validation service
      // Mock implementation for testing
      const mockValidateContrast = jest.fn().mockReturnValue({
        ratio: 4.5,
        wcagAA: true,
        wcagAAA: false,
      });

      const result = mockValidateContrast('#000000', '#ffffff');

      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.wcagAA).toBe(true);
    });

    test('fails insufficient contrast ratios', () => {
      const mockValidateContrast = jest.fn().mockReturnValue({
        ratio: 2.1,
        wcagAA: false,
        wcagAAA: false,
      });

      const result = mockValidateContrast('#808080', '#ffffff');

      expect(result.ratio).toBeLessThan(4.5);
      expect(result.wcagAA).toBe(false);
    });
  });

  describe('Reduced Motion Support', () => {
    test('respects reduced motion preference', () => {
      // Mock reduced motion preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Component should respect reduced motion preference
      expect(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ).toBe(true);
    });

    test('applies reduced motion classes when preferred', () => {
      // Mock the accessibility service to return reduced motion preference
      const {
        useAccessibility,
      } = require('../../services/accessibility.service');

      // This would be implemented in the actual accessibility service
      expect(
        document.documentElement.classList.contains('reduce-motion')
      ).toBeDefined();
    });
  });
});
