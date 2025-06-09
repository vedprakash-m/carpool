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
exports.default = BulkSelectionTools;
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
const PREFERENCE_LEVELS = [
    { value: "", label: "No Preference", color: "bg-gray-100 text-gray-600" },
    {
        value: "preferable",
        label: "Prefer",
        color: "bg-green-100 text-green-800",
    },
    {
        value: "less_preferable",
        label: "If Needed",
        color: "bg-yellow-100 text-yellow-800",
    },
    {
        value: "unavailable",
        label: "Can't Drive",
        color: "bg-red-100 text-red-800",
    },
];
const DAY_NAMES = [
    { name: "Monday", dayOfWeek: 1 },
    { name: "Tuesday", dayOfWeek: 2 },
    { name: "Wednesday", dayOfWeek: 3 },
    { name: "Thursday", dayOfWeek: 4 },
    { name: "Friday", dayOfWeek: 5 },
];
const TIME_TYPES = [
    { name: "Morning Drop-offs", routeType: "school_dropoff", icon: "🌅" },
    { name: "Afternoon Pick-ups", routeType: "school_pickup", icon: "🌇" },
];
function BulkSelectionTools({ slots, preferences, onBulkPreferenceChange, canEdit, }) {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const [selectedLevel, setSelectedLevel] = (0, react_1.useState)("");
    const getSlotsByPattern = (pattern) => {
        switch (pattern) {
            case "all_morning":
                return slots
                    .filter((slot) => slot.routeType === "school_dropoff")
                    .map((slot) => slot.id);
            case "all_afternoon":
                return slots
                    .filter((slot) => slot.routeType === "school_pickup")
                    .map((slot) => slot.id);
            case "all_monday":
                return slots
                    .filter((slot) => slot.dayOfWeek === 1)
                    .map((slot) => slot.id);
            case "all_tuesday":
                return slots
                    .filter((slot) => slot.dayOfWeek === 2)
                    .map((slot) => slot.id);
            case "all_wednesday":
                return slots
                    .filter((slot) => slot.dayOfWeek === 3)
                    .map((slot) => slot.id);
            case "all_thursday":
                return slots
                    .filter((slot) => slot.dayOfWeek === 4)
                    .map((slot) => slot.id);
            case "all_friday":
                return slots
                    .filter((slot) => slot.dayOfWeek === 5)
                    .map((slot) => slot.id);
            case "weekdays_morning":
                return slots
                    .filter((slot) => slot.routeType === "school_dropoff")
                    .map((slot) => slot.id);
            case "weekdays_afternoon":
                return slots
                    .filter((slot) => slot.routeType === "school_pickup")
                    .map((slot) => slot.id);
            default:
                return [];
        }
    };
    const handleBulkSelection = (pattern) => {
        if (!selectedLevel || !canEdit)
            return;
        const slotIds = getSlotsByPattern(pattern);
        onBulkPreferenceChange(slotIds, selectedLevel);
    };
    const getPatternSummary = (pattern) => {
        const slotIds = getSlotsByPattern(pattern);
        const currentPreferences = slotIds.map((id) => preferences[id] || "");
        const uniquePreferences = Array.from(new Set(currentPreferences));
        if (uniquePreferences.length === 1) {
            const level = PREFERENCE_LEVELS.find((l) => l.value === uniquePreferences[0]);
            return level ? level.label : "Mixed";
        }
        return "Mixed";
    };
    const clearAllPreferences = () => {
        if (!canEdit)
            return;
        const allSlotIds = slots.map((slot) => slot.id);
        onBulkPreferenceChange(allSlotIds, "");
    };
    if (!canEdit) {
        return null; // Don't show bulk tools when editing is disabled
    }
    return (<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center">
            <outline_1.BoltIcon className="w-5 h-5 text-purple-600 mr-2"/>
            <h3 className="text-lg font-medium text-gray-900">
              Quick Selection Tools
            </h3>
          </div>
          <div className="text-gray-400">{isExpanded ? "−" : "+"}</div>
        </button>
        <p className="text-sm text-gray-600 mt-1">
          Set preferences for multiple time slots at once
        </p>
      </div>

      {isExpanded && (<div className="p-4 space-y-6">
          {/* Preference Level Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Choose preference level for bulk selection:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PREFERENCE_LEVELS.map((level) => (<button key={level.value} onClick={() => setSelectedLevel(level.value)} className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedLevel === level.value
                    ? level.color + " border-blue-500 ring-2 ring-blue-200"
                    : level.color + " border-gray-200 hover:border-gray-300"}`}>
                  {selectedLevel === level.value && (<outline_1.CheckIcon className="w-4 h-4 inline mr-1"/>)}
                  {level.label}
                </button>))}
            </div>
          </div>

          {selectedLevel && (<>
              {/* By Time Period */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <outline_1.ClockIcon className="w-4 h-4 mr-2"/>
                  Select by Time Period
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TIME_TYPES.map((timeType) => (<button key={timeType.routeType} onClick={() => handleBulkSelection(`all_${timeType.routeType === "school_dropoff"
                        ? "morning"
                        : "afternoon"}`)} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{timeType.icon}</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {timeType.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            All{" "}
                            {timeType.routeType === "school_dropoff"
                        ? "morning"
                        : "afternoon"}{" "}
                            slots
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Current:{" "}
                        {getPatternSummary(`all_${timeType.routeType === "school_dropoff"
                        ? "morning"
                        : "afternoon"}`)}
                      </div>
                    </button>))}
                </div>
              </div>

              {/* By Day of Week */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <outline_1.CalendarDaysIcon className="w-4 h-4 mr-2"/>
                  Select by Day of Week
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {DAY_NAMES.map((day) => (<button key={day.dayOfWeek} onClick={() => handleBulkSelection(`all_${day.name.toLowerCase()}`)} className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                      <div className="font-medium text-gray-900 text-sm">
                        {day.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Both slots
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getPatternSummary(`all_${day.name.toLowerCase()}`)}
                      </div>
                    </button>))}
                </div>
              </div>

              {/* Common Patterns */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Common Patterns
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => handleBulkSelection("weekdays_morning")} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">🌅</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          All Morning Drop-offs
                        </div>
                        <div className="text-xs text-gray-500">
                          Monday - Friday mornings
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getPatternSummary("weekdays_morning")}
                    </div>
                  </button>

                  <button onClick={() => handleBulkSelection("weekdays_afternoon")} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">🌇</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          All Afternoon Pick-ups
                        </div>
                        <div className="text-xs text-gray-500">
                          Monday - Friday afternoons
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getPatternSummary("weekdays_afternoon")}
                    </div>
                  </button>
                </div>
              </div>
            </>)}

          {/* Clear All */}
          <div className="pt-4 border-t border-gray-200">
            <button onClick={clearAllPreferences} className="w-full p-3 border border-red-200 rounded-lg text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors">
              Clear All Preferences
            </button>
          </div>

          {/* Usage Tip */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h5 className="text-sm font-medium text-purple-900 mb-1">
              💡 Pro Tip
            </h5>
            <p className="text-sm text-purple-800">
              Use bulk selection to quickly set similar preferences, then
              fine-tune individual slots as needed. This saves time when you
              have consistent availability patterns.
            </p>
          </div>
        </div>)}
    </div>);
}
