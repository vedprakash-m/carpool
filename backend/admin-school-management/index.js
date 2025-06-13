const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock school storage (replace with actual database in production)
let mockSchools = [
  {
    id: "school-1",
    name: "Tesla STEM High School",
    address: "123 Oak Street, Springfield, IL 62701",
    location: {
      address: "123 Oak Street, Springfield, IL 62701",
      latitude: 47.674,
      longitude: -122.1215,
      zipCode: "62701",
      city: "Springfield",
      state: "IL",
      country: "USA",
      formattedAddress: "123 Oak Street, Springfield, IL 62701, USA",
    },
    district: "Springfield School District 186",
    type: "elementary",
    grades: ["K", "1", "2", "3", "4", "5"],
    contactInfo: {
      phone: "(217) 555-0123",
      email: "school-contact@example.com", // Example email for demo purposes
      website: "https://example-school.edu",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "school-2",
    name: "Washington Middle School",
    address: "456 Maple Avenue, Springfield, IL 62702",
    location: {
      address: "456 Maple Avenue, Springfield, IL 62702",
      latitude: 39.7965,
      longitude: -89.644,
      zipCode: "62702",
      city: "Springfield",
      state: "IL",
      country: "USA",
      formattedAddress: "456 Maple Avenue, Springfield, IL 62702, USA",
    },
    district: "Springfield School District 186",
    type: "middle",
    grades: ["6", "7", "8"],
    contactInfo: {
      phone: "(217) 555-0124",
      email: "middle-school@example.com", // Example email for demo purposes
      website: "https://example-middle-school.edu",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "school-3",
    name: "Roosevelt High School",
    address: "789 Pine Boulevard, Springfield, IL 62703",
    location: {
      address: "789 Pine Boulevard, Springfield, IL 62703",
      latitude: 39.8014,
      longitude: -89.6298,
      zipCode: "62703",
      city: "Springfield",
      state: "IL",
      country: "USA",
      formattedAddress: "789 Pine Boulevard, Springfield, IL 62703, USA",
    },
    district: "Springfield School District 186",
    type: "high",
    grades: ["9", "10", "11", "12"],
    contactInfo: {
      phone: "(217) 555-0125",
      email: "high-school@example.com", // Example email for demo purposes
      website: "https://example-high-school.edu",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Utility function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// Mock geocoding function (replace with actual service like Google Maps API)
function mockGeocode(address) {
  // Simplified mock - in production, use Google Maps Geocoding API
  const mockCoordinates = {
    springfield: { lat: 47.674, lng: -122.1215 },
    lincoln: { lat: 39.7965, lng: -89.644 },
    washington: { lat: 39.8014, lng: -89.6298 },
    roosevelt: { lat: 39.77, lng: -89.65 },
  };

  const lowerAddress = address.toLowerCase();
  for (const [key, coords] of Object.entries(mockCoordinates)) {
    if (lowerAddress.includes(key)) {
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        formattedAddress: address + ", USA",
      };
    }
  }

  // Default to Springfield center
  return {
    latitude: 47.674,
    longitude: -122.1215,
    formattedAddress: address + ", Springfield, IL, USA",
  };
}

module.exports = async function (context, req) {
  try {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError("Authentication required");
      return;
    }

    // Simple token validation (replace with actual JWT validation)
    const token = authHeader.split(" ")[1];
    if (!token.includes("admin") && !token.includes("trip_admin")) {
      context.res = UnifiedResponseHandler.forbiddenError(
        "Admin or Group Admin access required"
      );
      return;
    }

    const method = req.method;
    const action = req.query.action;

    if (method === "GET" && !action) {
      // List all schools
      const { search, type, district, userLat, userLng, maxDistance } =
        req.query;

      let filteredSchools = [...mockSchools];

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        filteredSchools = filteredSchools.filter(
          (school) =>
            school.name.toLowerCase().includes(searchLower) ||
            school.address.toLowerCase().includes(searchLower) ||
            school.district?.toLowerCase().includes(searchLower)
        );
      }

      if (type) {
        filteredSchools = filteredSchools.filter(
          (school) => school.type === type
        );
      }

      if (district) {
        filteredSchools = filteredSchools.filter((school) =>
          school.district?.toLowerCase().includes(district.toLowerCase())
        );
      }

      // Calculate distances if user location provided
      if (userLat && userLng) {
        filteredSchools = filteredSchools.map((school) => ({
          ...school,
          distance: calculateDistance(
            parseFloat(userLat),
            parseFloat(userLng),
            school.location.latitude,
            school.location.longitude
          ),
        }));

        // Filter by max distance if specified
        if (maxDistance) {
          filteredSchools = filteredSchools.filter(
            (school) => school.distance <= parseFloat(maxDistance)
          );
        }

        // Sort by distance
        filteredSchools.sort((a, b) => a.distance - b.distance);
      }

      context.res = UnifiedResponseHandler.success(
        {
          schools: filteredSchools,
          total: filteredSchools.length,
        },
        "Schools retrieved successfully"
      );
      return;
    }

    if (method === "GET" && action === "search") {
      // Advanced school search for group creation
      const { schoolName, location, maxDistanceMiles = 10 } = req.query;

      let results = [...mockSchools];

      if (schoolName) {
        const searchLower = schoolName.toLowerCase();
        results = results.filter((school) =>
          school.name.toLowerCase().includes(searchLower)
        );
      }

      if (location) {
        // Parse location (format: "lat,lng")
        const [lat, lng] = location.split(",").map(parseFloat);
        results = results
          .map((school) => ({
            ...school,
            distance: calculateDistance(
              lat,
              lng,
              school.location.latitude,
              school.location.longitude
            ),
          }))
          .filter((school) => school.distance <= parseFloat(maxDistanceMiles))
          .sort((a, b) => a.distance - b.distance);
      }

      context.res = UnifiedResponseHandler.success(
        {
          schools: results,
        },
        "School search completed successfully"
      );
      return;
    }

    if (method === "POST") {
      // Create new school (Group Admin only)
      const { name, address, district, type, grades, contactInfo } = req.body;

      // Validation
      if (!name || !address || !type || !grades) {
        context.res = UnifiedResponseHandler.validationError(
          "Name, address, type, and grades are required"
        );
        return;
      }

      // Validate school type
      const validTypes = ["elementary", "middle", "high", "k12", "other"];
      if (!validTypes.includes(type)) {
        context.res = UnifiedResponseHandler.validationError(
          "Invalid school type"
        );
        return;
      }

      // Geocode address
      const geocodeResult = mockGeocode(address);

      // Extract location components from address
      const addressParts = address.split(",").map((part) => part.trim());
      const zipCode =
        addressParts[addressParts.length - 1]?.match(/\d{5}/)?.[0];
      const state =
        addressParts[addressParts.length - 1]?.match(/[A-Z]{2}/)?.[0];
      const city = addressParts[addressParts.length - 2];

      // Create new school
      const newSchool = {
        id: uuidv4(),
        name,
        address,
        location: {
          address,
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          zipCode,
          city,
          state,
          country: "USA",
          formattedAddress: geocodeResult.formattedAddress,
        },
        district,
        type,
        grades: Array.isArray(grades) ? grades : [grades],
        contactInfo: contactInfo || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store school (mock storage for now)
      mockSchools.push(newSchool);

      context.res = UnifiedResponseHandler.created(
        {
          school: newSchool,
        },
        "School created successfully"
      );
      return;
    }

    if (method === "GET" && req.query.id) {
      // Get specific school by ID
      const schoolId = req.query.id;
      const school = mockSchools.find((s) => s.id === schoolId);

      if (!school) {
        context.res = UnifiedResponseHandler.notFoundError("School not found");
        return;
      }

      context.res = UnifiedResponseHandler.success(
        {
          school,
        },
        "School retrieved successfully"
      );
      return;
    }

    // Invalid method or action
    context.res = UnifiedResponseHandler.methodNotAllowedError(
      `Method ${method} not allowed`
    );
  } catch (error) {
    context.log.error("School management error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};
