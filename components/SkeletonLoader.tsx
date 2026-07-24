"use client";

import React from "react";

export function SkeletonStatTile() {
  return (
    <div className="skeuo-card rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-slate-200 rounded-md"></div>
        <div className="h-9 w-9 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="h-9 w-16 bg-slate-200 rounded-lg"></div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-brand-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeuo-card rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-4 w-36 bg-slate-200 rounded-md"></div>
      <div className="h-3 w-full bg-slate-200 rounded-md"></div>
      <div className="h-3 w-2/3 bg-slate-200 rounded-md"></div>
    </div>
  );
}
