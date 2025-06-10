/**
 * Refactored CalendarView component using container/presentational pattern
 *
 * Original component was 479 lines - now reduced to ~50 lines with better separation of concerns.
 * Business logic moved to useCalendarData hook, UI components split into focused presentational components.
 */

"use client";

import { memo } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRenderPerformance } from "@/hooks/usePerformanceOptimization";
import { useCalendarData } from "@/hooks/useCalendarData";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarLoading } from "./calendar/CalendarLoading";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { CalendarFooter } from "./calendar/CalendarFooter";

interface CalendarViewProps {
  className?: string;
  showCreateButton?: boolean;
  onDateClick?: (date: string) => void;
}

export default memo(function CalendarViewRefactored({
  className = "",
  showCreateButton = false,
  onDateClick,
}: CalendarViewProps) {
  useRenderPerformance("CalendarView");

  const { user } = useAuthStore();
  const {
    currentWeek,
    isLoading,
    weekDates,
    weekRangeText,
    navigateWeek,
    isToday,
    getAssignmentsForDate,
    setCurrentWeek,
  } = useCalendarData();

  const handleGoToToday = () => {
    setCurrentWeek(new Date());
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <CalendarHeader
        weekRangeText={weekRangeText}
        onNavigateWeek={navigateWeek}
        onGoToToday={handleGoToToday}
        showCreateButton={showCreateButton}
        userRole={user?.role}
      />

      <div className="p-6">
        {isLoading ? (
          <CalendarLoading />
        ) : (
          <CalendarGrid
            weekDates={weekDates}
            isToday={isToday}
            getAssignmentsForDate={getAssignmentsForDate}
            onDateClick={onDateClick}
          />
        )}
      </div>

      <CalendarFooter
        showCreateButton={showCreateButton}
        userRole={user?.role}
      />
    </div>
  );
});
