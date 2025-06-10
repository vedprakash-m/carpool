/**
 * Refactored EmergencyPanel component using container/presentational pattern
 * Main container that coordinates all emergency-related functionality
 */

"use client";

import React, { memo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEmergencyData } from "@/hooks/useEmergencyData";
import { useRenderPerformance } from "@/hooks/usePerformanceOptimization";
import { EmergencyActionButtons } from "./EmergencyActionButtons";
import { EmergencyContactsList } from "./EmergencyContactsList";
import { BackupDriversList } from "./BackupDriversList";
import { EmergencyGuidelines } from "./EmergencyGuidelines";
import { EmergencyReportModal } from "./EmergencyReportModal";
import { BackupRequestModal } from "./BackupRequestModal";

interface EmergencyPanelProps {
  onEmergencyReport: (
    type: string,
    description: string,
    urgency: string
  ) => void;
  onRequestBackup: (assignmentId: string, reason: string) => void;
  onContactEmergency: (contactId: string, method: string) => void;
}

export default memo(function EmergencyPanelRefactored({
  onEmergencyReport,
  onRequestBackup,
  onContactEmergency,
}: EmergencyPanelProps) {
  useRenderPerformance("EmergencyPanel");

  const {
    // Data
    emergencyContacts,
    backupDrivers,
    emergencyTypes,

    // UI State
    isExpanded,
    showEmergencyForm,
    showBackupRequest,

    // Form State
    selectedEmergencyType,
    emergencyDescription,
    backupReason,

    // State Setters
    setSelectedEmergencyType,
    setEmergencyDescription,
    setBackupReason,

    // Handlers
    handleEmergencySubmit,
    handleBackupRequest,
    handleContactEmergency,

    // UI Controls
    toggleExpanded,
    showEmergencyReportForm,
    hideEmergencyReportForm,
    showBackupRequestForm,
    hideBackupRequestForm,

    // Utilities
    getUrgencyColor,
  } = useEmergencyData({
    onEmergencyReport,
    onRequestBackup,
    onContactEmergency,
  });

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-lg">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-red-200">
        <button
          onClick={toggleExpanded}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-bold text-red-900">Emergency Panel</h3>
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              24/7 Support
            </span>
          </div>
          <div className="text-red-600">{isExpanded ? "−" : "+"}</div>
        </button>
        <p className="text-sm text-red-700 mt-1">
          Quick access to emergency contacts and backup coordination
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          <EmergencyActionButtons
            onReportEmergency={showEmergencyReportForm}
            onRequestBackup={showBackupRequestForm}
          />

          <EmergencyContactsList
            contacts={emergencyContacts}
            onContactEmergency={handleContactEmergency}
          />

          <BackupDriversList drivers={backupDrivers} />

          <EmergencyGuidelines />
        </div>
      )}

      {/* Modals */}
      <EmergencyReportModal
        isVisible={showEmergencyForm}
        selectedEmergencyType={selectedEmergencyType}
        emergencyDescription={emergencyDescription}
        emergencyTypes={emergencyTypes}
        onTypeChange={setSelectedEmergencyType}
        onDescriptionChange={setEmergencyDescription}
        onSubmit={handleEmergencySubmit}
        onCancel={hideEmergencyReportForm}
        getUrgencyColor={getUrgencyColor}
      />

      <BackupRequestModal
        isVisible={showBackupRequest}
        backupReason={backupReason}
        onReasonChange={setBackupReason}
        onSubmit={handleBackupRequest}
        onCancel={hideBackupRequestForm}
      />
    </div>
  );
});
