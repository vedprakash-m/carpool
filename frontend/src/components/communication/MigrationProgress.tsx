"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface MigrationProgressProps {
  groupId: string;
  onStartMigration: () => void;
}

interface MigrationStatus {
  migrationScore: number; // 0-100% in-app adoption
  inAppMessages: number;
  whatsappMessages: number;
  phase: "starting" | "transitioning" | "completing";
  recommendations: string[];
  incentives: Incentive[];
}

interface Incentive {
  id: string;
  title: string;
  description: string;
  type: "feature" | "achievement" | "convenience";
  unlocked: boolean;
  progress?: number;
  requirement: string;
}

export default function MigrationProgress({
  groupId,
  onStartMigration,
}: MigrationProgressProps) {
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedIncentive, setSelectedIncentive] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadMigrationStatus();
    // Check progress every 30 seconds
    const interval = setInterval(loadMigrationStatus, 30000);
    return () => clearInterval(interval);
  }, [groupId]);

  const loadMigrationStatus = async () => {
    try {
      const response = await fetch(
        `/api/communication/migration-status/${groupId}`
      );
      const data = await response.json();
      if (data.success) {
        setMigrationStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to load migration status:", error);
    }
  };

  const startMigrationJourney = () => {
    onStartMigration();
    // Track migration start analytics
    trackMigrationEvent("journey_started", { groupId });
  };

  const trackMigrationEvent = (event: string, data: any) => {
    // Analytics tracking for migration progress
    console.log(`Migration event: ${event}`, data);
  };

  if (!migrationStatus) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "starting":
        return "🌱";
      case "transitioning":
        return "🚀";
      case "completing":
        return "⭐";
      default:
        return "📱";
    }
  };

  const getPhaseMessage = (phase: string, score: number) => {
    switch (phase) {
      case "starting":
        return `Getting started! ${score}% of communication is now in-app.`;
      case "transitioning":
        return `Great progress! ${score}% in-app communication achieved.`;
      case "completing":
        return `Almost there! ${score}% of your group uses in-app communication.`;
      default:
        return `Your group has ${score}% in-app communication adoption.`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Migration Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {getPhaseIcon(migrationStatus.phase)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Communication Migration
              </h3>
              <p className="text-sm text-gray-600">
                {getPhaseMessage(
                  migrationStatus.phase,
                  migrationStatus.migrationScore
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide" : "View"} Details
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Migration Progress</span>
            <span>{migrationStatus.migrationScore}%</span>
          </div>
          <Progress
            value={migrationStatus.migrationScore}
            className="h-3 bg-gray-200"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>WhatsApp Only</span>
            <span>Hybrid</span>
            <span>In-App Primary</span>
          </div>
        </div>

        {/* Phase-specific Call-to-Action */}
        {migrationStatus.phase === "starting" && (
          <div className="bg-blue-100 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">
              🎯 Ready to upgrade your group chat?
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Experience seamless carpool coordination with features designed
              specifically for your group.
            </p>
            <Button
              onClick={startMigrationJourney}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start In-App Communication
            </Button>
          </div>
        )}

        {migrationStatus.phase === "transitioning" && (
          <div className="bg-green-100 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-green-900 mb-2">
              🌟 You're doing great!
            </h4>
            <p className="text-sm text-green-700 mb-3">
              Your group is actively using in-app features. Try voice messages
              and location sharing!
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="border-green-600 text-green-700"
              >
                Try Voice Messages
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-green-600 text-green-700"
              >
                Share Location
              </Button>
            </div>
          </div>
        )}

        {migrationStatus.phase === "completing" && (
          <div className="bg-purple-100 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-purple-900 mb-2">
              🎉 Almost fully migrated!
            </h4>
            <p className="text-sm text-purple-700 mb-3">
              Your group is thriving with in-app communication. WhatsApp can now
              be backup-only!
            </p>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() =>
                trackMigrationEvent("migration_completed", { groupId })
              }
            >
              Mark Migration Complete
            </Button>
          </div>
        )}
      </div>

      {/* Detailed Statistics */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-4">
            Communication Breakdown
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {migrationStatus.inAppMessages}
              </div>
              <div className="text-sm text-blue-700">In-App Messages</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {migrationStatus.whatsappMessages}
              </div>
              <div className="text-sm text-gray-700">WhatsApp Messages</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-800 mb-3">💡 Next Steps</h5>
            <ul className="space-y-2">
              {migrationStatus.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Available Incentives */}
      {migrationStatus.incentives.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-4">
            🎁 Unlock New Features
          </h4>

          <div className="grid gap-4">
            {migrationStatus.incentives.map((incentive) => (
              <div
                key={incentive.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    incentive.unlocked
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50 hover:border-blue-200"
                  }
                  ${
                    selectedIncentive === incentive.id
                      ? "ring-2 ring-blue-300"
                      : ""
                  }
                `}
                onClick={() =>
                  setSelectedIncentive(
                    selectedIncentive === incentive.id ? null : incentive.id
                  )
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-800">
                    {incentive.unlocked ? "✅" : "🔒"} {incentive.title}
                  </h5>
                  <span
                    className={`
                    text-xs px-2 py-1 rounded-full
                    ${
                      incentive.type === "feature"
                        ? "bg-blue-100 text-blue-700"
                        : incentive.type === "achievement"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-orange-100 text-orange-700"
                    }
                  `}
                  >
                    {incentive.type}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {incentive.description}
                </p>

                {!incentive.unlocked && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Requirement:</span>{" "}
                    {incentive.requirement}
                    {incentive.progress !== undefined && (
                      <div className="mt-2">
                        <Progress value={incentive.progress} className="h-2" />
                        <span className="text-xs">
                          {incentive.progress}% complete
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {incentive.unlocked && selectedIncentive === incentive.id && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Activate the feature
                        activateIncentiveFeature(incentive.id);
                      }}
                    >
                      Try This Feature
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Benefits Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          🌟 Why In-App Communication?
        </h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">📅</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Schedule Integration
                </h5>
                <p className="text-xs text-gray-600">
                  Messages automatically linked to pickup dates and children
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">🚨</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Emergency Protocols
                </h5>
                <p className="text-xs text-gray-600">
                  Instant emergency alerts with automatic escalation
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">📍</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Location Sharing
                </h5>
                <p className="text-xs text-gray-600">
                  Real-time pickup coordination with route updates
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">🎤</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Voice Messages
                </h5>
                <p className="text-xs text-gray-600">
                  Quick audio updates while driving safely
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">📊</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Smart Insights
                </h5>
                <p className="text-xs text-gray-600">
                  Communication analytics to improve coordination
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">🔒</span>
              <div>
                <h5 className="text-sm font-medium text-gray-800">
                  Privacy Control
                </h5>
                <p className="text-xs text-gray-600">
                  Better control over who sees what information
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to activate incentive features
function activateIncentiveFeature(incentiveId: string) {
  // Implementation would navigate to the specific feature or show tutorial
  console.log(`Activating feature: ${incentiveId}`);
}
