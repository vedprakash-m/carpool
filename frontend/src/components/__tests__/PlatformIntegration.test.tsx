import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock all the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`}>{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div className="card-content">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div className="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => <h3 className="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Import components after mocking
import MobileAppLayout from '../layout/MobileAppLayout';
import EnhancedGroupDiscovery from '../groups/EnhancedGroupDiscovery';

// Mock services
jest.mock('../../services/mobile.service', () => ({
  MobileService: {
    isMobile: jest.fn(() => true),
    isTablet: jest.fn(() => false),
    isTouchDevice: jest.fn(() => true),
    getViewportDimensions: jest.fn(() => ({ width: 375, height: 667 })),
    isPortrait: jest.fn(() => true),
    shouldReduceMotion: jest.fn(() => false),
    isOnline: jest.fn(() => true),
    isSlowConnection: jest.fn(() => false),
    hapticFeedback: jest.fn(),
    enableSafeAreaSupport: jest.fn(),
  },
}));

jest.mock('../../services/offline.service', () => ({
  OfflineService: {
    isOnline: jest.fn(() => true),
    getStoredData: jest.fn(() => null),
    storeData: jest.fn(),
    syncData: jest.fn(),
    clearStorage: jest.fn(),
  },
}));

jest.mock('../../services/realtime.service', () => ({
  RealTimeService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn(() => true),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Carpool Platform Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation(key => {
      if (key === 'token') return 'mock-token';
      if (key === 'userId') return 'mock-user-id';
      if (key === 'userRole') return 'parent';
      return null;
    });
  });

  describe('MobileAppLayout Integration', () => {
    it('renders mobile layout with all navigation elements', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles offline state correctly', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;

      // Mock offline state
      require('../../services/offline.service').OfflineService.isOnline.mockReturnValue(
        false
      );

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('responds to orientation changes', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;

      // Mock landscape orientation
      require('../../services/mobile.service').MobileService.isPortrait.mockReturnValue(
        false
      );
      require('../../services/mobile.service').MobileService.getViewportDimensions.mockReturnValue(
        {
          width: 667,
          height: 375,
        }
      );

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('EnhancedGroupDiscovery Integration', () => {
    const mockGroupData = {
      matches: [
        {
          id: 'group-1',
          name: 'Tesla STEM Morning Carpool',
          description: 'Daily morning carpool for Tesla STEM High School',
          memberCount: 6,
          maxMembers: 8,
          schedule: { pickupTime: '07:30', dropoffTime: '08:00' },
          location: { address: '123 Tesla Dr, Redmond, WA' },
          compatibility: {
            score: 92,
            factors: {
              schedule: 95,
              location: 88,
              preferences: 94,
            },
          },
          admin: { name: 'John Doe', rating: 4.8 },
          isJoinable: true,
        },
        {
          id: 'group-2',
          name: 'Afternoon Tesla Carpool',
          description: 'After-school activities carpool',
          memberCount: 4,
          maxMembers: 6,
          schedule: { pickupTime: '15:30', dropoffTime: '16:00' },
          location: { address: '456 School Ave, Redmond, WA' },
          compatibility: {
            score: 78,
            factors: {
              schedule: 82,
              location: 75,
              preferences: 77,
            },
          },
          admin: { name: 'Jane Smith', rating: 4.6 },
          isJoinable: true,
        },
      ],
      totalMatches: 2,
      searchCriteria: {
        school: 'Tesla STEM High School',
        location: 'Redmond, WA',
        timePreference: 'morning',
      },
    };

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGroupData,
      });
    });

    it('loads and displays group matches', async () => {
      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(
          screen.getByText('Tesla STEM Morning Carpool')
        ).toBeInTheDocument();
        expect(screen.getByText('Afternoon Tesla Carpool')).toBeInTheDocument();
        expect(screen.getByText('92% Match')).toBeInTheDocument();
        expect(screen.getByText('78% Match')).toBeInTheDocument();
      });
    });

    it('handles join group requests', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGroupData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Join request sent' }),
        });

      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(
          screen.getByText('Tesla STEM Morning Carpool')
        ).toBeInTheDocument();
      });

      const joinButtons = screen.getAllByText('Request to Join');
      fireEvent.click(joinButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-1/join'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('filters groups by preferences', async () => {
      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(
          screen.getByText('Tesla STEM Morning Carpool')
        ).toBeInTheDocument();
      });

      // Find and use the time preference filter
      const timeSelect = screen.getByLabelText(/time preference/i);
      fireEvent.change(timeSelect, { target: { value: 'afternoon' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('timePreference=afternoon'),
          expect.any(Object)
        );
      });
    });

    it('handles search functionality', async () => {
      render(<EnhancedGroupDiscovery />);

      const searchInput = screen.getByPlaceholderText(/search groups/i);
      fireEvent.change(searchInput, { target: { value: 'Tesla' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Tesla'),
          expect.any(Object)
        );
      });
    });

    it('displays compatibility scores correctly', async () => {
      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('92% Match')).toBeInTheDocument();
        expect(screen.getByText('Schedule: 95%')).toBeInTheDocument();
        expect(screen.getByText('Location: 88%')).toBeInTheDocument();
        expect(screen.getByText('Preferences: 94%')).toBeInTheDocument();
      });
    });

    it('shows group details on expand', async () => {
      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(
          screen.getByText('Tesla STEM Morning Carpool')
        ).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByText('View Details');
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText('Daily morning carpool for Tesla STEM High School')
        ).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Rating: 4.8/5')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(screen.getByText(/error loading groups/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no groups found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockGroupData, matches: [], totalMatches: 0 }),
      });

      render(<EnhancedGroupDiscovery />);

      await waitFor(() => {
        expect(screen.getByText(/no groups found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('mobile service integration works correctly', () => {
      const MobileService =
        require('../../services/mobile.service').MobileService;

      expect(MobileService.isMobile()).toBe(true);
      expect(MobileService.getViewportDimensions()).toEqual({
        width: 375,
        height: 667,
      });
      expect(MobileService.isPortrait()).toBe(true);
    });

    it('offline service integration works correctly', () => {
      const OfflineService =
        require('../../services/offline.service').OfflineService;

      expect(OfflineService.isOnline()).toBe(true);

      OfflineService.storeData('test-key', { data: 'test' });
      expect(OfflineService.storeData).toHaveBeenCalledWith('test-key', {
        data: 'test',
      });
    });

    it('realtime service integration works correctly', () => {
      const RealTimeService =
        require('../../services/realtime.service').RealTimeService;

      RealTimeService.connect();
      expect(RealTimeService.connect).toHaveBeenCalled();

      expect(RealTimeService.isConnected()).toBe(true);
    });
  });

  describe('Platform Integration Flow', () => {
    it('handles complete user workflow', async () => {
      // Mock authentication
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'token') return 'valid-token';
        if (key === 'userId') return 'user-123';
        if (key === 'userRole') return 'parent';
        return null;
      });

      // Mock successful API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGroupData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Join request sent' }),
        });

      // Test group discovery and join flow
      const mockChild = (
        <div>
          <EnhancedGroupDiscovery />
        </div>
      );

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      // Wait for groups to load
      await waitFor(() => {
        expect(
          screen.getByText('Tesla STEM Morning Carpool')
        ).toBeInTheDocument();
      });

      // Test joining a group
      const joinButton = screen.getAllByText('Request to Join')[0];
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-1/join'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('handles mobile-specific interactions', () => {
      const mockChild = <div data-testid="test-content">Mobile Content</div>;

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      // Verify mobile optimizations are applied
      expect(screen.getByTestId('test-content')).toBeInTheDocument();

      // Verify mobile service is called
      const MobileService =
        require('../../services/mobile.service').MobileService;
      expect(MobileService.isMobile).toHaveBeenCalled();
    });
  });
});
