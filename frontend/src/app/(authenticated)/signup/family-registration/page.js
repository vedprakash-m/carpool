"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = FamilyRegistrationPage;
const react_1 = __importDefault(require("react"));
const FamilyRegistrationForm_1 = __importDefault(require("./FamilyRegistrationForm"));
exports.metadata = {
    title: "Family Registration - VCarpool",
    description: "Register your family for VCarpool with comprehensive setup",
};
function FamilyRegistrationPage() {
    return <FamilyRegistrationForm_1.default />;
}
