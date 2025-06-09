"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = generateStaticParams;
exports.default = EditTripPage;
// Static params generation for build-time export
async function generateStaticParams() {
    // For static export, we need to provide some default params
    // In a real application, you might fetch trip IDs from an API
    // For now, we'll generate some placeholder IDs
    return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }];
}
// Mark the page component as client-side only
const client_page_1 = __importDefault(require("./client-page"));
function EditTripPage() {
    return <client_page_1.default />;
}
