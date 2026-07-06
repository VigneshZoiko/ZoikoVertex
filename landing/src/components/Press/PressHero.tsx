"use client";

import Image from "next/image";
import { Mail } from "lucide-react";

function RequestInterviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.52431 3.796C4.52431 3.64 4.47231 3.51 4.36831 3.406C4.26431 3.302 4.13865 3.25 3.99131 3.25H3.44531C3.29798 3.25 3.17015 3.302 3.06181 3.406C2.95348 3.51 2.89931 3.63783 2.89931 3.7895C2.89931 3.94117 2.95348 4.069 3.06181 4.173C3.17015 4.277 3.29798 4.329 3.44531 4.329H3.99131C4.13865 4.329 4.26431 4.277 4.36831 4.173C4.47231 4.069 4.52431 3.94333 4.52431 3.796ZM3.44531 3.25C3.15065 3.25 2.87981 3.32367 2.63281 3.471C2.38581 3.61833 2.18865 3.8155 2.04131 4.0625C1.89398 4.3095 1.82031 4.58033 1.82031 4.875C1.82031 5.02233 1.87231 5.15017 1.97631 5.2585C2.08031 5.36683 2.20815 5.421 2.35981 5.421C2.51148 5.421 2.63931 5.36683 2.74331 5.2585C2.84731 5.15017 2.89931 5.02233 2.89931 4.875C2.89931 4.72767 2.95348 4.59983 3.06181 4.4915C3.17015 4.38317 3.29798 4.329 3.44531 4.329C3.59265 4.329 3.72048 4.277 3.82881 4.173C3.93715 4.069 3.99131 3.94117 3.99131 3.7895C3.99131 3.63783 3.93715 3.51 3.82881 3.406C3.72048 3.302 3.59265 3.25 3.44531 3.25ZM2.36631 4.329C2.21031 4.329 2.08031 4.38317 1.97631 4.4915C1.87231 4.59983 1.82031 4.72767 1.82031 4.875V9.75C1.82031 9.89733 1.87231 10.0252 1.97631 10.1335C2.08031 10.2418 2.20815 10.296 2.35981 10.296C2.51148 10.296 2.63931 10.2418 2.74331 10.1335C2.84731 10.0252 2.89931 9.89733 2.89931 9.75V4.875C2.89931 4.72767 2.84731 4.59983 2.74331 4.4915C2.63931 4.38317 2.51365 4.329 2.36631 4.329ZM1.82031 9.75C1.82031 10.0447 1.89398 10.3155 2.04131 10.5625C2.18865 10.8095 2.38581 11.0067 2.63281 11.154C2.87981 11.3013 3.15065 11.375 3.44531 11.375C3.59265 11.375 3.72048 11.323 3.82881 11.219C3.93715 11.115 3.99131 10.9872 3.99131 10.8355C3.99131 10.6838 3.93715 10.556 3.82881 10.452C3.72048 10.348 3.59265 10.296 3.44531 10.296C3.29798 10.296 3.17015 10.2418 3.06181 10.1335C2.95348 10.0252 2.89931 9.89733 2.89931 9.75C2.89931 9.60267 2.84731 9.47483 2.74331 9.3665C2.63931 9.25817 2.51148 9.204 2.35981 9.204C2.20815 9.204 2.08031 9.25817 1.97631 9.3665C1.87231 9.47483 1.82031 9.60267 1.82031 9.75ZM2.89931 10.829C2.89931 10.985 2.95348 11.115 3.06181 11.219C3.17015 11.323 3.29798 11.375 3.44531 11.375H8.32031C8.46765 11.375 8.59548 11.323 8.70381 11.219C8.81215 11.115 8.86631 10.9872 8.86631 10.8355C8.86631 10.6838 8.81215 10.556 8.70381 10.452C8.59548 10.348 8.46765 10.296 8.32031 10.296H3.44531C3.29798 10.296 3.17015 10.348 3.06181 10.452C2.95348 10.556 2.89931 10.6817 2.89931 10.829ZM8.32031 11.375C8.61498 11.375 8.88581 11.3013 9.13281 11.154C9.37981 11.0067 9.57698 10.8095 9.72431 10.5625C9.87165 10.3155 9.94531 10.0447 9.94531 9.75C9.94531 9.60267 9.89331 9.47483 9.78931 9.3665C9.68531 9.25817 9.55748 9.204 9.40581 9.204C9.25415 9.204 9.12631 9.25817 9.02231 9.3665C8.91831 9.47483 8.86631 9.60267 8.86631 9.75C8.86631 9.89733 8.81215 10.0252 8.70381 10.1335C8.59548 10.2418 8.46765 10.296 8.32031 10.296C8.17298 10.296 8.04515 10.348 7.93681 10.452C7.82848 10.556 7.77431 10.6838 7.77431 10.8355C7.77431 10.9872 7.82848 11.115 7.93681 11.219C8.04515 11.323 8.17298 11.375 8.32031 11.375ZM9.39931 10.296C9.55531 10.296 9.68531 10.2418 9.78931 10.1335C9.89331 10.0252 9.94531 9.89733 9.94531 9.75V9.204C9.94531 9.05667 9.89331 8.931 9.78931 8.827C9.68531 8.723 9.55748 8.671 9.40581 8.671C9.25415 8.671 9.12631 8.723 9.02231 8.827C8.91831 8.931 8.86631 9.05667 8.86631 9.204V9.75C8.86631 9.89733 8.91831 10.0252 9.02231 10.1335C9.12631 10.2418 9.25198 10.296 9.39931 10.296ZM11.6223 3.952C11.839 3.73533 11.9841 3.48183 12.0578 3.1915C12.1315 2.90117 12.1315 2.613 12.0578 2.327C11.9841 2.041 11.839 1.78967 11.6223 1.573C11.4056 1.35633 11.1543 1.21117 10.8683 1.1375C10.5823 1.06383 10.2941 1.06383 10.0038 1.1375C9.71348 1.21117 9.45998 1.35633 9.24331 1.573C9.13931 1.677 9.08731 1.80483 9.08731 1.9565C9.08731 2.10817 9.13931 2.236 9.24331 2.34C9.34731 2.444 9.47515 2.496 9.62681 2.496C9.77848 2.496 9.90848 2.44183 10.0168 2.3335C10.1251 2.22517 10.2638 2.171 10.4328 2.171C10.6018 2.171 10.7426 2.22733 10.8553 2.34C10.968 2.45267 11.0243 2.5935 11.0243 2.7625C11.0243 2.9315 10.9701 3.07017 10.8618 3.1785C10.7535 3.28683 10.6993 3.41683 10.6993 3.5685C10.6993 3.72017 10.7513 3.848 10.8553 3.952C10.9593 4.056 11.0871 4.108 11.2388 4.108C11.3905 4.108 11.5183 4.056 11.6223 3.952ZM10.0103 1.573C9.90631 1.469 9.77848 1.417 9.62681 1.417C9.47515 1.417 9.34731 1.469 9.24331 1.573L4.69331 6.123C4.58065 6.227 4.52431 6.35267 4.52431 6.5C4.52431 6.64733 4.57848 6.77517 4.68681 6.8835C4.79515 6.99183 4.92298 7.046 5.07031 7.046C5.21765 7.046 5.34331 6.98967 5.44731 6.877L10.0103 2.34C10.1143 2.236 10.1663 2.10817 10.1663 1.9565C10.1663 1.80483 10.1143 1.677 10.0103 1.573ZM5.07031 5.954C4.92298 5.954 4.79515 6.00817 4.68681 6.1165C4.57848 6.22483 4.52431 6.35267 4.52431 6.5V8.125C4.52431 8.27233 4.57848 8.40017 4.68681 8.5085C4.79515 8.61683 4.92298 8.671 5.07031 8.671C5.21765 8.671 5.34548 8.61683 5.45381 8.5085C5.56215 8.40017 5.61631 8.27233 5.61631 8.125V6.5C5.61631 6.35267 5.56215 6.22483 5.45381 6.1165C5.34548 6.00817 5.21765 5.954 5.07031 5.954ZM4.52431 8.125C4.52431 8.27233 4.57848 8.40017 4.68681 8.5085C4.79515 8.61683 4.92298 8.671 5.07031 8.671H6.69531C6.84265 8.671 6.97048 8.61683 7.07881 8.5085C7.18715 8.40017 7.24131 8.27233 7.24131 8.125C7.24131 7.97767 7.18715 7.84983 7.07881 7.7415C6.97048 7.63317 6.84265 7.579 6.69531 7.579H5.07031C4.92298 7.579 4.79515 7.63317 4.68681 7.7415C4.57848 7.84983 4.52431 7.97767 4.52431 8.125ZM6.31831 8.502C6.42231 8.61467 6.54798 8.671 6.69531 8.671C6.84265 8.671 6.96831 8.61467 7.07231 8.502L11.6223 3.952C11.7263 3.848 11.7783 3.72017 11.7783 3.5685C11.7783 3.41683 11.7263 3.289 11.6223 3.185C11.5183 3.081 11.3905 3.029 11.2388 3.029C11.0871 3.029 10.9593 3.081 10.8553 3.185L6.31831 7.748C6.20565 7.852 6.14931 7.97767 6.14931 8.125C6.14931 8.27233 6.20565 8.398 6.31831 8.502ZM8.47631 2.327C8.37231 2.431 8.32031 2.55883 8.32031 2.7105C8.32031 2.86217 8.37231 2.99 8.47631 3.094L10.1013 4.719C10.2053 4.823 10.3331 4.875 10.4848 4.875C10.6365 4.875 10.7643 4.823 10.8683 4.719C10.9723 4.615 11.0243 4.48717 11.0243 4.3355C11.0243 4.18383 10.9723 4.056 10.8683 3.952L9.24331 2.327C9.13931 2.223 9.01148 2.171 8.85981 2.171C8.70815 2.171 8.58031 2.223 8.47631 2.327Z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

export default function PressHero() {
  return (
    <section className="relative min-h-[640px] flex items-center overflow-hidden bg-[#0A0E1A] pt-[68px]">
      <div className="absolute inset-0">
        <Image
          src="/images/press/hero-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#0A0E1A]/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/55 to-[#0A0E1A]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A]/40 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full py-16 grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6"
            style={{
              borderRadius: "100px",
              border: "1px solid rgba(201, 168, 76, 0.25)",
              background: "rgba(201, 168, 76, 0.12)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Official Newsroom &middot; Page 08
            </span>
          </div>

          <h1 className="text-[clamp(2.75rem,6vw,4.2rem)] font-black leading-[1.02] tracking-tight mb-6">
            <span className="block text-white">Press &amp;</span>
            <span className="block text-[#20E7F2]">Media.</span>
          </h1>

          <p className="text-[16px] text-white/60 leading-relaxed mb-4 max-w-[520px]">
            Official media resources, approved company descriptions, brand assets, spokesperson access, and newsroom updates for ZoikoVertex.
          </p>

          <p className="text-[13px] text-white/35 font-mono">
            For journalists, analysts, event organizers, podcast producers, and media professionals.
          </p>
        </div>

        <div
          className="relative p-7 backdrop-blur-[8px]"
          style={{
            borderRadius: "14px",
            borderTop: "2px solid #20E7F2",
            borderRight: "1px solid #20E7F2",
            borderBottom: "1px solid #20E7F2",
            borderLeft: "1px solid #20E7F2",
            background: "rgba(8, 14, 26, 0.88)",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Media Contact</span>
          </div>

          <div className="flex flex-col gap-5 mb-7">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mb-1.5">Email</div>
              <div className="text-[#21E6F3] text-[14px] italic">[press@zoikovertex.com &mdash; TBC]</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mb-1.5">Press Contact</div>
              <div className="text-[#C9A84C] text-[14px] italic">[Contact name &mdash; pending approval]</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mb-1.5">Response</div>
              <p className="text-white/60 text-[13.5px] leading-relaxed">
                Media inquiries reviewed by the communications team. Please include your organization, topic, and deadline.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mb-1.5">Location</div>
              <div className="text-white text-[14px]">Sacramento, California, USA</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition">
              <Mail className="w-4 h-4" />
              Email Media Relations
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-sm font-medium text-white/80 hover:bg-white/5 transition">
              <RequestInterviewIcon className="w-3.5 h-3.5" />
              Request an Interview
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
