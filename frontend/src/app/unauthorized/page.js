"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UnauthorizedPage;
const react_1 = __importDefault(require("react"));
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
function UnauthorizedPage() {
    const router = (0, navigation_1.useRouter)();
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
      <card_1.Card className="w-full max-w-md">
        <card_1.CardHeader>
          <card_1.CardTitle className="text-2xl font-bold text-center text-red-600">
            Access Denied
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            You don't have permission to access this page. Please contact your
            administrator if you believe this is an error.
          </p>
          <div className="flex justify-center space-x-4">
            <button_1.Button variant="outline" onClick={() => router.back()}>
              Go Back
            </button_1.Button>
            <button_1.Button onClick={() => router.push("/")}>Go to Home</button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
