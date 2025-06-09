"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GroupSchedulePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const outline_1 = require("@heroicons/react/24/outline");
function GroupSchedulePage() {
    const params = (0, navigation_1.useParams)();
    const groupId = params.groupId;
    const [generating, setGenerating] = (0, react_1.useState)(false);
    const [message, setMessage] = (0, react_1.useState)(null);
    const [schedule, setSchedule] = (0, react_1.useState)(null);
    const generateSchedule = async () => {
        setGenerating(true);
        setMessage(null);
        try {
            // This will eventually call our backend API
            // const response = await fetch(`/api/admin/groups/${groupId}/schedule`, { method: 'POST' });
            // const data = await response.json();
            // Mocking the API call for now
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const mockData = {
                success: true,
                message: "Schedule generated successfully!",
                schedule: {
                    week: "July 29 - August 2, 2024",
                    assignments: [
                        { day: "Monday", driver: "John P." },
                        { day: "Tuesday", driver: "Sarah J." },
                        { day: "Wednesday", driver: "Mike C." },
                        { day: "Thursday", driver: "Jane D." },
                        { day: "Friday", driver: "John P." },
                    ],
                    conflicts: [],
                    stats: {
                        satisfactionRate: "95%",
                        equityScore: "87/100",
                    },
                },
            };
            if (mockData.success) {
                setMessage({ type: "success", text: mockData.message });
                setSchedule(mockData.schedule);
            }
            else {
                setMessage({ type: "error", text: "Failed to generate schedule" });
            }
        }
        catch (error) {
            setMessage({
                type: "error",
                text: "An error occurred while generating the schedule.",
            });
        }
        finally {
            setGenerating(false);
        }
    };
    return (<div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Scheduling for Group {groupId}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <button onClick={generateSchedule} disabled={generating} className="btn-primary">
          {generating ? (<>
              <outline_1.ArrowPathIcon className="h-5 w-5 mr-2 animate-spin"/>
              Generating...
            </>) : (<>
              <outline_1.PlayIcon className="h-5 w-5 mr-2"/>
              Generate Weekly Schedule
            </>)}
        </button>

        {message && (<div className={`mt-4 p-4 rounded-md ${message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"}`}>
            {message.type === "success" ? (<outline_1.CheckCircleIcon className="h-5 w-5 inline-block mr-2"/>) : (<outline_1.ExclamationTriangleIcon className="h-5 w-5 inline-block mr-2"/>)}
            {message.text}
          </div>)}

        {schedule && (<div className="mt-6">
            <h2 className="text-xl font-semibold">
              Generated Schedule for {schedule.week}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">Assignments</h3>
                <ul className="mt-2 space-y-1">
                  {schedule.assignments.map((a) => (<li key={a.day}>
                      {a.day}: {a.driver}
                    </li>))}
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">Statistics</h3>
                <p className="mt-2">
                  Preference Satisfaction: {schedule.stats.satisfactionRate}
                </p>
                <p>Equity Score: {schedule.stats.equityScore}</p>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
}
