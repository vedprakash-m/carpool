"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_AREA_RADIUS_MILES = exports.TESLA_STEM_HIGH_SCHOOL = exports.MessageType = void 0;
// Message and Chat types
var MessageType;
(function (MessageType) {
    MessageType["text"] = "text";
    MessageType["location"] = "location";
    MessageType["system"] = "system";
    MessageType["image"] = "image";
})(MessageType || (exports.MessageType = MessageType = {}));
// Tesla STEM High School Configuration
exports.TESLA_STEM_HIGH_SCHOOL = {
    id: "tesla-stem-redmond",
    name: "Tesla STEM High School",
    address: "4301 228th Ave NE, Redmond, WA 98053",
    location: {
        address: "4301 228th Ave NE, Redmond, WA 98053",
        latitude: 47.674,
        longitude: -122.1215,
        zipCode: "98053",
        city: "Redmond",
        state: "WA",
        country: "USA",
        formattedAddress: "4301 228th Ave NE, Redmond, WA 98053, USA",
    },
    district: "Lake Washington School District",
    type: "high",
    grades: ["9", "10", "11", "12"],
    contactInfo: {
        phone: "(425) 936-2410",
        email: "tesla@lwsd.org",
        website: "https://tesla.lwsd.org",
    },
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
};
// Service Area Configuration
exports.SERVICE_AREA_RADIUS_MILES = 25;
//# sourceMappingURL=types.js.map