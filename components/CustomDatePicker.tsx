"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
}

export default function CustomDatePicker({
  value,
  onChange,
  className = "",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsed = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth()); // 0-indexed

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate days in view month
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    const formatted = `${viewYear}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const displayFormatted = value
    ? new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Select Date";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl skeuo-input bg-white text-brand-navy font-semibold text-sm transition-all"
      >
        <span>{displayFormatted}</span>
        <CalendarIcon className="w-4 h-4 text-brand-coral shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white p-3 shadow-2xl border border-brand-border z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-brand-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-brand-navy">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 pt-2 text-center">
            {daysOfWeek.map((d) => (
              <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1 text-center">
            {/* Blank padding days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Month Days */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(dayNum).padStart(2, "0");
              const dateStr = `${viewYear}-${mm}-${dd}`;
              const isSelected = dateStr === value;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors mx-auto flex items-center justify-center ${
                    isSelected
                      ? "bg-brand-coral text-white shadow-md shadow-brand-coral/30"
                      : "text-brand-navy hover:bg-slate-100"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
