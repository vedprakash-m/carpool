"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FamilyRegistrationForm;
const react_1 = __importStar(require("react"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
function FamilyRegistrationForm() {
    const router = (0, navigation_1.useRouter)();
    const [step, setStep] = (0, react_1.useState)(1);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)("");
    const [formData, setFormData] = (0, react_1.useState)({
        primaryParent: {
            name: "",
            email: "",
            phone: "",
            canDrive: true,
        },
        secondaryParent: null,
        familyStructure: "single",
        children: [{ name: "", age: 0, school: "", grade: "", medicalNotes: "" }],
        address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
        },
        vehicles: [
            { make: "", model: "", year: 2020, capacity: 4, licensePlate: "" },
        ],
        preferences: {
            availableDays: [],
            timeSlots: [],
            maxDistance: 10,
            emergencyContact: "",
            emergencyPhone: "",
        },
    });
    const handleInputChange = (section, field, value) => {
        setFormData((prev) => {
            // Handle nested objects
            if (typeof prev[section] === "object" && prev[section] !== null) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [field]: value,
                    },
                };
            }
            // Handle direct fields
            return {
                ...prev,
                [section]: value,
            };
        });
    };
    const handleChildChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            children: prev.children.map((child, i) => i === index ? { ...child, [field]: value } : child),
        }));
    };
    const handleVehicleChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            vehicles: prev.vehicles.map((vehicle, i) => i === index ? { ...vehicle, [field]: value } : vehicle),
        }));
    };
    const addChild = () => {
        setFormData((prev) => ({
            ...prev,
            children: [
                ...prev.children,
                { name: "", age: 0, school: "", grade: "", medicalNotes: "" },
            ],
        }));
    };
    const removeChild = (index) => {
        setFormData((prev) => ({
            ...prev,
            children: prev.children.filter((_, i) => i !== index),
        }));
    };
    const addVehicle = () => {
        setFormData((prev) => ({
            ...prev,
            vehicles: [
                ...prev.vehicles,
                { make: "", model: "", year: 2020, capacity: 4, licensePlate: "" },
            ],
        }));
    };
    const removeVehicle = (index) => {
        setFormData((prev) => ({
            ...prev,
            vehicles: prev.vehicles.filter((_, i) => i !== index),
        }));
    };
    const handlePreferenceChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [field]: value,
            },
        }));
    };
    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/family-registration", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });
            if (!response.ok) {
                throw new Error("Registration failed");
            }
            await response.json();
            router.push("/parents/dashboard?welcome=true");
        }
        catch (err) {
            setError("Registration failed. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    const renderStep = () => {
        // ... (Keep the entire renderStep switch statement here)
        switch (step) {
            case 1:
                return (<div className="space-y-6">
            <div className="text-center">
              <lucide_react_1.Users className="h-12 w-12 text-blue-600 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold text-gray-900">
                Family Structure
              </h2>
              <p className="text-gray-600">
                Tell us about your family composition
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Structure
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData((prev) => ({
                        ...prev,
                        familyStructure: "single",
                    }))} className={`p-4 border-2 rounded-lg text-center ${formData.familyStructure === "single"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"}`}>
                    <lucide_react_1.User className="h-8 w-8 mx-auto mb-2 text-gray-600"/>
                    <div className="text-sm font-medium">Single Parent</div>
                  </button>
                  <button type="button" onClick={() => setFormData((prev) => ({
                        ...prev,
                        familyStructure: "dual",
                    }))} className={`p-4 border-2 rounded-lg text-center ${formData.familyStructure === "dual"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"}`}>
                    <lucide_react_1.Users className="h-8 w-8 mx-auto mb-2 text-gray-600"/>
                    <div className="text-sm font-medium">Two Parents</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Parent Name
                  </label>
                  <input type="text" value={formData.primaryParent.name} onChange={(e) => handleInputChange("primaryParent", "name", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your name"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input type="email" value={formData.primaryParent.email} onChange={(e) => handleInputChange("primaryParent", "email", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input type="tel" value={formData.primaryParent.phone} onChange={(e) => handleInputChange("primaryParent", "phone", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(555) 123-4567"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Can Drive?
                  </label>
                  <select value={formData.primaryParent.canDrive ? "yes" : "no"} onChange={(e) => handleInputChange("primaryParent", "canDrive", e.target.value === "yes")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="yes">Yes, I can drive</option>
                    <option value="no">No, I cannot drive</option>
                  </select>
                </div>
              </div>

              {formData.familyStructure === "dual" && (<div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Second Parent (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input type="text" value={formData.secondaryParent?.name || ""} onChange={(e) => {
                            const newSecondary = formData.secondaryParent || {
                                name: "",
                                email: "",
                                phone: "",
                                canDrive: true,
                            };
                            setFormData((prev) => ({
                                ...prev,
                                secondaryParent: {
                                    ...newSecondary,
                                    name: e.target.value,
                                },
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Second parent name"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input type="email" value={formData.secondaryParent?.email || ""} onChange={(e) => {
                            const newSecondary = formData.secondaryParent || {
                                name: "",
                                email: "",
                                phone: "",
                                canDrive: true,
                            };
                            setFormData((prev) => ({
                                ...prev,
                                secondaryParent: {
                                    ...newSecondary,
                                    email: e.target.value,
                                },
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Second parent email"/>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>);
            case 2:
                return (<div className="space-y-6">
            <div className="text-center">
              <lucide_react_1.User className="h-12 w-12 text-blue-600 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold text-gray-900">
                Children Information
              </h2>
              <p className="text-gray-600">
                Add your children who will participate in carpools
              </p>
            </div>

            <div className="space-y-4">
              {formData.children.map((child, index) => (<div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Child {index + 1}</h3>
                    {formData.children.length > 1 && (<button type="button" onClick={() => removeChild(index)} className="text-red-600 hover:text-red-800">
                        <lucide_react_1.X className="h-5 w-5"/>
                      </button>)}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input type="text" value={child.name} onChange={(e) => {
                            const newChildren = [...formData.children];
                            newChildren[index].name = e.target.value;
                            setFormData((prev) => ({
                                ...prev,
                                children: newChildren,
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Child's name"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input type="number" value={child.age} onChange={(e) => {
                            const newChildren = [...formData.children];
                            newChildren[index].age = parseInt(e.target.value);
                            setFormData((prev) => ({
                                ...prev,
                                children: newChildren,
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Age"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        School
                      </label>
                      <input type="text" value={child.school} onChange={(e) => {
                            const newChildren = [...formData.children];
                            newChildren[index].school = e.target.value;
                            setFormData((prev) => ({
                                ...prev,
                                children: newChildren,
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School name"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade
                      </label>
                      <input type="text" value={child.grade} onChange={(e) => {
                            const newChildren = [...formData.children];
                            newChildren[index].grade = e.target.value;
                            setFormData((prev) => ({
                                ...prev,
                                children: newChildren,
                            }));
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Grade (e.g., 3rd, K)"/>
                    </div>
                  </div>
                </div>))}

              <button type="button" onClick={addChild} className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center">
                <lucide_react_1.Plus className="h-5 w-5 mr-2"/>
                Add Another Child
              </button>
            </div>
          </div>);
            case 3:
                return (<div className="space-y-6">
            <div className="text-center">
              <lucide_react_1.MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold text-gray-900">
                Address & Vehicle
              </h2>
              <p className="text-gray-600">
                We need your address and vehicle information
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input type="text" value={formData.address.street} onChange={(e) => handleInputChange("address", "street", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main Street"/>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input type="text" value={formData.address.city} onChange={(e) => handleInputChange("address", "city", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="City"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input type="text" value={formData.address.state} onChange={(e) => handleInputChange("address", "state", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="CA"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input type="text" value={formData.address.zipCode} onChange={(e) => handleInputChange("address", "zipCode", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12345"/>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make & Model
                    </label>
                    <input type="text" value={`${formData.vehicles[0].make} ${formData.vehicles[0].model}`} onChange={(e) => {
                        const [make, ...modelParts] = e.target.value.split(" ");
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].make = make || "";
                        newVehicles[0].model = modelParts.join(" ") || "";
                        setFormData((prev) => ({
                            ...prev,
                            vehicles: newVehicles,
                        }));
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Toyota Camry"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input type="number" value={formData.vehicles[0].year} onChange={(e) => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].year = parseInt(e.target.value);
                        setFormData((prev) => ({
                            ...prev,
                            vehicles: newVehicles,
                        }));
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2020"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seating Capacity
                    </label>
                    <select value={formData.vehicles[0].capacity} onChange={(e) => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].capacity = parseInt(e.target.value);
                        setFormData((prev) => ({
                            ...prev,
                            vehicles: newVehicles,
                        }));
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="4">4 seats</option>
                      <option value="5">5 seats</option>
                      <option value="7">7 seats</option>
                      <option value="8">8 seats</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Plate
                    </label>
                    <input type="text" value={formData.vehicles[0].licensePlate} onChange={(e) => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].licensePlate = e.target.value;
                        setFormData((prev) => ({
                            ...prev,
                            vehicles: newVehicles,
                        }));
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABC123"/>
                  </div>
                </div>
              </div>
            </div>
          </div>);
            case 4:
                return (<div className="space-y-6">
            <div className="text-center">
              <lucide_react_1.CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold text-gray-900">
                Review & Submit
              </h2>
              <p className="text-gray-600">
                Please review your information before submitting
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Family Structure</h3>
                <p className="text-gray-600">
                  {formData.familyStructure === "single"
                        ? "Single Parent"
                        : "Two Parents"}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Primary Parent</h3>
                <p className="text-gray-600">
                  {formData.primaryParent.name} ({formData.primaryParent.email})
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Children</h3>
                <ul className="text-gray-600">
                  {formData.children.map((child, index) => (<li key={index}>
                      {child.name}, age {child.age} - {child.school} (
                      {child.grade})
                    </li>))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Address</h3>
                <p className="text-gray-600">
                  {formData.address.street}, {formData.address.city},{" "}
                  {formData.address.state} {formData.address.zipCode}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Vehicle</h3>
                <p className="text-gray-600">
                  {formData.vehicles[0].year} {formData.vehicles[0].make}{" "}
                  {formData.vehicles[0].model}({formData.vehicles[0].capacity}{" "}
                  seats)
                </p>
              </div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <lucide_react_1.AlertCircle className="h-5 w-5 text-red-400 mr-2"/>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>)}
          </div>);
            default:
                return null;
        }
    };
    return (<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((stepNum) => (<div key={stepNum} className={`flex items-center justify-center w-8 h-8 rounded-full ${stepNum <= step
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"}`}>
                  {stepNum}
                </div>))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }}/>
            </div>
          </div>

          {/* Step Content */}
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 1} className={`flex items-center px-4 py-2 rounded-md ${step === 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              <lucide_react_1.ArrowLeft className="h-4 w-4 mr-2"/>
              Previous
            </button>

            {step < 4 ? (<button type="button" onClick={() => setStep(step + 1)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Next
                <lucide_react_1.ArrowRight className="h-4 w-4 ml-2"/>
              </button>) : (<button type="button" onClick={handleSubmit} disabled={loading} className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">
                {loading ? "Submitting..." : "Complete Registration"}
                <lucide_react_1.CheckCircle className="h-4 w-4 ml-2"/>
              </button>)}
          </div>
        </div>
      </div>
    </div>);
}
