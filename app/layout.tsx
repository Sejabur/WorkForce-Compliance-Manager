"use client";

import React, { useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import WelcomeModal from "@/components/WelcomeModal";
import { RBACProvider } from "@/lib/rbac";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <title>WorkForce Compliance Manager by sejabur.dev</title>
        <meta name="description" content="Enterprise Labor Law Compliance & AI-Powered Schedule Risk Engine" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[#FFFFFF] text-brand-navy antialiased selection:bg-brand-coral/20 selection:text-brand-coral">
        <RBACProvider>
          {/* First Time Visitor Public Demo Welcome Popup */}
          <WelcomeModal />

          <div className="min-h-screen">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <main
              className={`w-full min-h-screen bg-slate-50/50 transition-all duration-300 ${
                isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
              }`}
            >
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
                {children}
              </div>
            </main>
          </div>
        </RBACProvider>
      </body>
    </html>
  );
}
