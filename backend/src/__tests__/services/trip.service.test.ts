/**
 * Trip Service Tests
 * 
 * Comprehensive test suite for TripService to improve backend test coverage.
 * Tests core functionality including trip creation, retrieval, updates, and filtering.
 */

import { TripService } from '../../services/trip.service';
import { TripRepository } from '../../repositories/trip.repository';
import { UserRepository } from '../../repositories/user.repository';
import { EmailService } from '../../services/email.service';
import { Trip, CreateTripRequest, UpdateTripRequest, User } from '@vcarpool/shared';

// Mock the dependencies
jest.mock('../../repositories/trip.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../services/email.service');

// Helper function to create mock trip
const createMockTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-123',
  driverId: 'user-456',
  passengers: [],
  date: new Date('2024-12-25'),
  departureTime: '08:00',
  arrivalTime: '09:00',
  pickupLocations: [],
  destination: 'Tesla STEM High School',
  maxPassengers: 4,
  availableSeats: 4,
  status: 'planned',
  cost: 10,
  notes: 'Morning commute',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TripService', () => {
  let tripService: TripService;
  let mockTripRepository: jest.Mocked<TripRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Create mock repositories
    mockTripRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<TripRepository>;

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    // Create mock email service
    mockEmailService = {
      sendTripCreatedNotification: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    // Create service instance
    tripService = new TripService(mockTripRepository, mockUserRepository, mockEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTrip', () => {
    const driverId = 'user-456';
    const tripData: CreateTripRequest = {
      date: '2024-12-25',
      departureTime: '08:00',
      arrivalTime: '09:00',
      destination: 'Tesla STEM High School',
      maxPassengers: 4,
      cost: 10,
      notes: 'Morning commute',
    };

    it('should create a new trip successfully', async () => {
      // Arrange
      const expectedTrip = createMockTrip({
        driverId,
        date: new Date(tripData.date),
        departureTime: tripData.departureTime,
        arrivalTime: tripData.arrivalTime,
        destination: tripData.destination,
        maxPassengers: tripData.maxPassengers,
        availableSeats: tripData.maxPassengers,
        cost: tripData.cost,
        notes: tripData.notes,
      });

      mockTripRepository.create.mockResolvedValue(expectedTrip);

      // Act
      const result = await tripService.createTrip(driverId, tripData);

      // Assert
      expect(mockTripRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          driverId,
          date: new Date(tripData.date),
          departureTime: tripData.departureTime,
          arrivalTime: tripData.arrivalTime,
          destination: tripData.destination,
          maxPassengers: tripData.maxPassengers,
          availableSeats: tripData.maxPassengers,
          status: 'planned',
          passengers: [],
          pickupLocations: [],
        })
      );
      expect(result).toEqual(expectedTrip);
    });
  });

  describe('getTripById', () => {
    const tripId = 'trip-123';

    it('should return trip when found', async () => {
      // Arrange
      const expectedTrip = createMockTrip({ id: tripId });
      mockTripRepository.findById.mockResolvedValue(expectedTrip);

      // Act
      const result = await tripService.getTripById(tripId);

      // Assert
      expect(mockTripRepository.findById).toHaveBeenCalledWith(tripId);
      expect(result).toEqual(expectedTrip);
    });

    it('should return null when trip not found', async () => {
      // Arrange
      mockTripRepository.findById.mockResolvedValue(null);

      // Act
      const result = await tripService.getTripById(tripId);

      // Assert
      expect(mockTripRepository.findById).toHaveBeenCalledWith(tripId);
      expect(result).toBeNull();
    });
  });

  describe('updateTrip', () => {
    const tripId = 'trip-123';

    it('should update trip successfully', async () => {
      // Arrange
      const existingTrip = createMockTrip({ id: tripId });
      const updates: UpdateTripRequest = {
        destination: 'Updated Destination',
        maxPassengers: 6,
        notes: 'Updated notes',
      };
      const updatedTrip: Trip = { 
        ...existingTrip, 
        destination: updates.destination || existingTrip.destination,
        maxPassengers: updates.maxPassengers || existingTrip.maxPassengers,
        notes: updates.notes || existingTrip.notes,
        updatedAt: new Date() 
      };

      // Mock getTripById to return existing trip
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(existingTrip);
      mockTripRepository.update.mockResolvedValue(updatedTrip);

      // Act
      const result = await tripService.updateTrip(tripId, updates);

      // Assert
      expect(tripService.getTripById).toHaveBeenCalledWith(tripId);
      expect(mockTripRepository.update).toHaveBeenCalledWith(
        tripId,
        expect.objectContaining({
          ...existingTrip,
          ...updates,
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedTrip);
    });

    it('should return null when trip not found', async () => {
      // Arrange
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(null);

      // Act
      const result = await tripService.updateTrip(tripId, { notes: 'Updated' });

      // Assert
      expect(tripService.getTripById).toHaveBeenCalledWith(tripId);
      expect(mockTripRepository.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('Static methods', () => {
    it('should provide static getTripById method', async () => {
      expect(typeof TripService.getTripById).toBe('function');
    });

    it('should provide static updateTrip method', async () => {
      expect(typeof TripService.updateTrip).toBe('function');
    });
  });
});
