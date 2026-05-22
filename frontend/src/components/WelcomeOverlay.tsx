"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { BRAND } from "@/lib/brand";

export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("zoiko_welcome_seen");
    if (!hasSeenWelcome) {
      setShouldRender(true);
      const showTimer = setTimeout(() => setVisible(true), 100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        localStorage.setItem("zoiko_welcome_seen", "true");
      }, 4000);
      const removeTimer = setTimeout(() => setShouldRender(false), 5000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-1000 ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`text-center transition-all duration-1000 delay-300 transform ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        <div className="relative inline-block">
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20">
              <Image
                src="/images/logo-wordmark.svg"
                alt="ZoikoVertex Logo"
                fill
                className="object-cover"
              />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
              Welcome to <span className="text-indigo-500">{BRAND.name}</span>
            </h1>

            <h2 className="text-4xl font-black text-white tracking-tighter mb-2">
              Vertex Identity Verified
            </h2>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              Your governance workspace is now live and secured. Welcome to the
              future of execution.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes expand {
          0% {
            width: 0;
            opacity: 0;
          }
          100% {
            width: 96px;
            opacity: 1;
          }
        }
        .animate-expand {
          animation: expand 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.8s;
        }
      `}</style>
    </div>
  );
}
