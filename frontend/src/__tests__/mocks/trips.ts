import { Trip } from "@/types/shared";

export const mockTrips: Trip[] = [
  {
    id: "trip-1",
    driverId: "user-1",
    passengerIds: ["user-2", "user-3"],
    status: "planned",
    origin: {
      latitude: 34.0522,
      longitude: -118.2437,
      name: "Downtown LA",
    },
    destination: {
      latitude: 34.0522,
      longitude: -118.2437,
      name: "Hollywood",
    },
    departureTime: new Date("2024-08-15T08:00:00Z"),
    arrivalTime: new Date("2024-08-15T09:00:00Z"),
    seats: 3,
    passengers: ["user-2", "user-3"],
  },
  {
    id: "trip-2",
    driverId: "user-4",
    passengerIds: [],
    status: "planned",
    origin: {
      latitude: 34.0522,
      longitude: -118.2437,
      name: "Santa Monica",
    },
    destination: {
      latitude: 34.0522,
      longitude: -118.2437,
      name: "Venice Beach",
    },
    departureTime: new Date("2024-08-16T10:00:00Z"),
    arrivalTime: new Date("2024-08-16T11:00:00Z"),
    seats: 2,
    passengers: [],
  },
];
