"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (timeStr: string) => void;
  className?: string;
}

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

function format12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
}

export default function CustomTimePicker({
  value,
  onChange,
  className = "",
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl skeuo-input bg-white text-brand-navy font-semibold text-sm transition-all"
      >
        <span>{format12h(value) || "Select Time"}</span>
        <Clock className="w-4 h-4 text-brand-coral shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl bg-white p-1.5 shadow-2xl border border-brand-border z-50 animate-in fade-in zoom-in-95 duration-150">
          {TIME_SLOTS.map((slot) => {
            const isSelected = slot === value;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onChange(slot);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-brand-coral text-white font-bold"
                    : "text-brand-navy hover:bg-slate-50"
                }`}
              >
                <span>{format12h(slot)}</span>
                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                  ({slot})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
