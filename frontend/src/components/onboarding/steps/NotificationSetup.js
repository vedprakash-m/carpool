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
exports.default = NotificationSetup;
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
function NotificationSetup({ onNext, onPrevious, onComplete, }) {
    const [settings, setSettings] = (0, react_1.useState)({
        emailNotifications: true,
        swapRequestNotifications: true,
        assignmentReminders: true,
        weeklyUpdates: false,
    });
    const handleToggle = (setting) => {
        setSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
    };
    const handleContinue = () => {
        // Save settings and continue
        onComplete();
    };
    return (<div className="space-y-6">
      <div className="text-center mb-6">
        <outline_1.BellIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3"/>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Notification Preferences
        </h3>
        <p className="text-gray-600">
          Choose how you'd like to stay informed about carpool activities.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <outline_1.EnvelopeIcon className="w-5 h-5 text-blue-600 mr-3"/>
              <div>
                <h4 className="font-medium text-gray-900">
                  Email Notifications
                </h4>
                <p className="text-sm text-gray-600">
                  Master switch for all email alerts
                </p>
              </div>
            </div>
            <button onClick={() => handleToggle("emailNotifications")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailNotifications ? "bg-green-600" : "bg-gray-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications
            ? "translate-x-6"
            : "translate-x-1"}`}/>
            </button>
          </div>

          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-800">
                  Swap Request Notifications
                </h5>
                <p className="text-sm text-gray-600">
                  When someone requests to swap with you
                </p>
              </div>
              <button onClick={() => handleToggle("swapRequestNotifications")} disabled={!settings.emailNotifications} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.swapRequestNotifications &&
            settings.emailNotifications
            ? "bg-green-600"
            : "bg-gray-200"} ${!settings.emailNotifications ? "opacity-50" : ""}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.swapRequestNotifications &&
            settings.emailNotifications
            ? "translate-x-6"
            : "translate-x-1"}`}/>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-800">
                  Assignment Reminders
                </h5>
                <p className="text-sm text-gray-600">
                  24h and 2h reminders before your assignments
                </p>
              </div>
              <button onClick={() => handleToggle("assignmentReminders")} disabled={!settings.emailNotifications} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.assignmentReminders && settings.emailNotifications
            ? "bg-green-600"
            : "bg-gray-200"} ${!settings.emailNotifications ? "opacity-50" : ""}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.assignmentReminders && settings.emailNotifications
            ? "translate-x-6"
            : "translate-x-1"}`}/>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center">
          <outline_1.CheckCircleIcon className="w-5 h-5 text-green-600 mr-3"/>
          <div>
            <h4 className="font-medium text-green-900">Recommended Settings</h4>
            <p className="text-sm text-green-800">
              We recommend keeping notifications enabled to stay coordinated
              with other families.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={handleContinue} className="px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors">
          Save & Continue
        </button>
        <p className="mt-2 text-sm text-gray-500">
          You can change these settings anytime from your dashboard
        </p>
      </div>
    </div>);
}
