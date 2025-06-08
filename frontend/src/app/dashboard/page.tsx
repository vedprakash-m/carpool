"use client";

import DashboardLayout from "@/components/DashboardLayout";
import UnifiedFamilyDashboard from "@/components/family/UnifiedFamilyDashboard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <SectionErrorBoundary sectionName="Unified Family Dashboard">
        <UnifiedFamilyDashboard />
      </SectionErrorBoundary>
    </DashboardLayout>
  );
}
