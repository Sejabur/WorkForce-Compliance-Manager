"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

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
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl skeuo-input bg-white text-brand-navy font-semibold text-sm transition-all disabled:bg-slate-100 disabled:opacity-75"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : "Select..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-brand-coral" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-white p-1.5 shadow-2xl border border-brand-border z-50 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                  isSelected
                    ? "bg-brand-coral text-white font-bold"
                    : "text-brand-navy hover:bg-slate-50"
                }`}
              >
                <div>
                  <div>{opt.label}</div>
                  {opt.sublabel && (
                    <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
