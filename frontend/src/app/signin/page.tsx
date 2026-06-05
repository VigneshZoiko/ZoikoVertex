"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: wire authentication
    console.log(`Sign in: ${email}`);
  }

  return (
    <div className="min-h-screen bg-[#071122] flex items-center justify-center px-4 py-12">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left marketing column */}
        <div className="lg:col-span-6 px-6 md:px-12">
          <div className="max-w-md mx-auto lg:mx-0">
            <div className="mb-8">
              <Image
                src="/images/ZoikoVertex_Logo_SVG%201.svg"
                alt="ZoikoVertex"
                width={220}
                height={48}
                className="object-contain"
              />
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Governed AI marketing.
              <br />
              <span className="text-cyan-400">Built for accountability.</span>
            </h2>

            <p className="text-white/60 mb-8">
              Every action governed. Every decision logged. Every output
              approved before it reaches the outside world.
            </p>

            <div className="space-y-4 text-white/70">
              <div className="flex gap-3 items-start">
                <div className="w-11 h-11 rounded-2xl bg-[#081524] flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Image
                    src="/images/Icon-1.svg"
                    alt="Access icon"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Role-based access control
                  </p>
                  <p className="text-sm text-white/60">
                    Immutable audit trail for every change.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-11 h-11 rounded-2xl bg-[#081524] flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Image
                    src="/images/Icon-2.svg"
                    alt="Agent icon"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    AI agents inside your policy boundaries
                  </p>
                  <p className="text-sm text-white/60">
                    Governed execution without losing automation speed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-11 h-11 rounded-2xl bg-[#081524] flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Image
                    src="/images/Icon-3.svg"
                    alt="Evidence icon"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Evidence-grade governance
                  </p>
                  <p className="text-sm text-white/60">
                    Built into workflows, not bolted on.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-11 h-11 rounded-2xl bg-[#081524] flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Image
                    src="/images/Icon-4.svg"
                    alt="Compliance icon"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    GDPR-compatible compliance
                  </p>
                  <p className="text-sm text-white/60">
                    SOC 2 readiness in progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sign-in card */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#0b1318] border border-white/6 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">
                Sign in to ZoikoVertex
              </h3>
              <p className="text-sm text-white/60 mt-1">
                Access your corporate workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/40">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  required
                  className="mt-2 w-full bg-transparent border border-white/6 rounded-md px-3 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-white/40">
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-transparent border border-white/6 rounded-md px-3 py-3 pr-12 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-white/60">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">
                    Keep me signed in on this device
                  </span>
                </label>
                <Link
                  href="/reset-password"
                  className="text-cyan-400 text-sm font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <button className="w-full py-3 rounded-md bg-cyan-400 text-black font-semibold mt-2">
                → Sign in
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px bg-white/6 flex-1" />
              <span className="text-xs text-white/40 uppercase">
                or continue with
              </span>
              <div className="h-px bg-white/6 flex-1" />
            </div>

            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 border border-white/6 rounded-md py-2 text-white/80 hover:bg-white/2">
                Continue with Google
              </button>
              <button className="w-full flex items-center justify-center gap-2 border border-white/6 rounded-md py-2 text-white/80 hover:bg-white/2">
                Continue with Microsoft
              </button>
            </div>

            <p className="text-xs text-white/50 mt-6">
              By signing in you agree to our{" "}
              <a href="#" className="text-white/70 underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-white/70 underline">
                Privacy Policy
              </a>
              .
            </p>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/60">
                Don’t have an account?{" "}
                <Link href="/signup" className="text-cyan-400 font-semibold">
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
