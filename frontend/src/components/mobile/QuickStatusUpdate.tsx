/**
 * Quick Status Update Component
 * Mobile-optimized interface for sending status updates while driving
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface QuickStatusProps {
  groupId: string;
  onStatusSent: (status: string) => void;
  isLoading?: boolean;
}

const QUICK_ACTIONS = [
  {
    id: "running_late_5",
    icon: "🕐",
    title: "Running 5 Min Late",
    message: "Running 5 minutes late",
    type: "delay",
    bgColor: "bg-yellow-500",
    textColor: "text-white",
  },
  {
    id: "running_late_10",
    icon: "⏰",
    title: "Running 10 Min Late",
    message: "Running 10 minutes late",
    type: "delay",
    bgColor: "bg-orange-500",
    textColor: "text-white",
  },
  {
    id: "pickup_complete",
    icon: "✅",
    title: "Pickup Complete",
    message: "All children picked up successfully",
    type: "success",
    bgColor: "bg-green-500",
    textColor: "text-white",
  },
  {
    id: "emergency",
    icon: "🚨",
    title: "Emergency",
    message: "Emergency situation - need immediate help",
    type: "emergency",
    bgColor: "bg-red-500",
    textColor: "text-white",
  },
  {
    id: "traffic_delay",
    icon: "🚗",
    title: "Traffic Delay",
    message: "Unexpected traffic delay",
    type: "delay",
    bgColor: "bg-blue-500",
    textColor: "text-white",
  },
  {
    id: "route_change",
    icon: "📍",
    title: "Route Change",
    message: "Taking alternate route",
    type: "info",
    bgColor: "bg-purple-500",
    textColor: "text-white",
  },
];

export default function QuickStatusUpdate({
  groupId,
  onStatusSent,
  isLoading = false,
}: QuickStatusProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    if (action.type === "emergency") {
      // Emergency requires confirmation
      setSelectedAction(action.id);
      setIsConfirming(true);
      return;
    }

    // Send status immediately for non-emergency actions
    await sendStatusUpdate(action);
  };

  const sendStatusUpdate = async (action: (typeof QUICK_ACTIONS)[0]) => {
    try {
      const response = await fetch("/api/mobile/quick-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          type: action.type,
          message: action.message,
          additionalData: {
            delayMinutes: action.id.includes("5")
              ? 5
              : action.id.includes("10")
              ? 10
              : 0,
          },
        }),
      });

      if (response.ok) {
        onStatusSent(action.message);
        setIsConfirming(false);
        setSelectedAction(null);

        // Show success feedback
        showSuccessToast(action.title);
      } else {
        throw new Error("Failed to send status update");
      }
    } catch (error) {
      console.error("Status update error:", error);
      showErrorToast("Failed to send status update");
    }
  };

  const confirmEmergency = async () => {
    const emergencyAction = QUICK_ACTIONS.find((a) => a.id === selectedAction);
    if (emergencyAction) {
      await sendStatusUpdate(emergencyAction);
    }
  };

  const showSuccessToast = (title: string) => {
    // Implementation would show toast notification
    console.log(`✅ ${title} sent to group`);
  };

  const showErrorToast = (message: string) => {
    // Implementation would show error toast
    console.error(`❌ ${message}`);
  };

  if (isConfirming && selectedAction) {
    const action = QUICK_ACTIONS.find((a) => a.id === selectedAction);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full">
          <div className="text-center">
            <div className="text-4xl mb-4">{action?.icon}</div>
            <h3 className="text-lg font-semibold mb-2">
              Confirm Emergency Alert
            </h3>
            <p className="text-gray-600 mb-6">
              This will immediately notify all group members and the Trip Admin.
              Are you sure you need emergency assistance?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirming(false);
                  setSelectedAction(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmEmergency}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={isLoading}
              >
                Send Emergency Alert
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Quick Status Updates
        </h2>
        <p className="text-sm text-gray-600">
          Tap to instantly notify your group
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            onClick={() => handleQuickAction(action)}
            disabled={isLoading}
            className={`
              ${action.bgColor} ${action.textColor} 
              hover:opacity-90 active:scale-95 
              h-20 flex flex-col items-center justify-center 
              text-sm font-medium transition-all duration-150
              touch-manipulation
            `}
            style={{ minHeight: "44px" }} // iOS touch target minimum
          >
            <div className="text-2xl mb-1">{action.icon}</div>
            <div className="text-center leading-tight">{action.title}</div>
          </Button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">💡 Voice Commands</h3>
        <p className="text-sm text-blue-700">
          You can also use voice commands:
        </p>
        <ul className="text-sm text-blue-600 mt-1 space-y-1">
          <li>• "I'm running 5 minutes late"</li>
          <li>• "Mark pickup complete"</li>
          <li>• "Emergency assistance needed"</li>
        </ul>
      </div>

      <div className="mt-4 text-center">
        <Button
          variant="outline"
          onClick={() => {
            // Open voice command interface
            if ("webkitSpeechRecognition" in window) {
              startVoiceCommand();
            } else {
              alert("Voice commands not supported on this device");
            }
          }}
          className="w-full h-12 text-base"
        >
          🎤 Use Voice Command
        </Button>
      </div>
    </div>
  );
}

/**
 * Voice Command Integration
 */
function startVoiceCommand() {
  const recognition = new (window as any).webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log("🎤 Voice recognition started");
  };

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    console.log("Voice command:", transcript);

    // Process voice command
    processVoiceCommand(transcript);
  };

  recognition.onerror = (event: any) => {
    console.error("Voice recognition error:", event.error);
  };

  recognition.start();
}

async function processVoiceCommand(transcript: string) {
  try {
    const response = await fetch("/api/mobile/voice-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: transcript,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Voice command processed:", result.response.message);
      // Show success feedback to user
    } else {
      console.log("❌ Voice command not understood:", result.message);
      // Show suggestions to user
    }
  } catch (error) {
    console.error("Voice command processing error:", error);
  }
}
