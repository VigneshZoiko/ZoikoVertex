"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";

function GovernanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.321823 2.2272C0.0242233 3.2352 -0.0669767 4.2528 0.0482233 5.28C0.163423 6.2784 0.458623 7.2216 0.933823 8.1096C1.40902 8.9976 2.03062 9.768 2.79862 10.4208C3.59542 11.0832 4.49302 11.568 5.49142 11.8752C5.65462 11.9232 5.80822 11.9088 5.95222 11.832C6.09622 11.7552 6.19222 11.6376 6.24022 11.4792C6.28822 11.3208 6.27382 11.1696 6.19702 11.0256C6.12022 10.8816 6.00502 10.7856 5.85142 10.7376C4.71862 10.3824 3.75382 9.7728 2.95702 8.9088C2.17942 8.0736 1.65622 7.0992 1.38742 5.9856C1.10902 4.8432 1.13782 3.7056 1.47382 2.5728C1.52182 2.4096 1.50502 2.256 1.42342 2.112C1.34182 1.968 1.22182 1.872 1.06342 1.824C0.905023 1.776 0.753823 1.7928 0.609823 1.8744C0.465823 1.956 0.369823 2.0736 0.321823 2.2272ZM0.869023 3.0048C1.87702 3.0432 2.86102 2.8944 3.82102 2.5584C4.78102 2.2224 5.64022 1.7184 6.39862 1.0464C6.51382 0.9408 6.57862 0.804 6.59302 0.636C6.60742 0.468 6.55942 0.324 6.44902 0.204C6.33862 0.084 6.19942 0.0168 6.03142 0.0024C5.86342 -0.012 5.71702 0.0384 5.59222 0.1536C4.95862 0.72 4.23622 1.1472 3.42502 1.4352C2.61382 1.7232 1.78102 1.8432 0.926623 1.7952C0.763423 1.7952 0.619423 1.8504 0.494623 1.9608C0.369823 2.0712 0.302623 2.208 0.293023 2.3712C0.283423 2.5344 0.336223 2.6784 0.451423 2.8032C0.566623 2.928 0.705823 2.9952 0.869023 3.0048ZM5.59222 1.0464C6.35062 1.7184 7.20982 2.2224 8.16982 2.5584C9.12982 2.8944 10.1138 3.0432 11.1218 3.0048C11.285 2.9952 11.4242 2.928 11.5394 2.8032C11.6546 2.6784 11.7074 2.5344 11.6978 2.3712C11.6882 2.208 11.621 2.0712 11.4962 1.9608C11.3714 1.8504 11.2274 1.7952 11.0642 1.7952C10.2098 1.8432 9.37702 1.7232 8.56582 1.4352C7.75462 1.1472 7.03222 0.72 6.39862 0.1536C6.27382 0.0384 6.12742 -0.012 5.95942 0.0024C5.79142 0.0168 5.65222 0.084 5.54182 0.204C5.43142 0.324 5.38342 0.468 5.39782 0.636C5.41222 0.804 5.47702 0.9408 5.59222 1.0464ZM11.6114 6.8208C11.8514 6.072 11.9762 5.3064 11.9858 4.524C11.9954 3.7416 11.8898 2.976 11.669 2.2272C11.621 2.0736 11.525 1.956 11.381 1.8744C11.237 1.7928 11.0858 1.776 10.9274 1.824C10.769 1.872 10.649 1.968 10.5674 2.112C10.4858 2.256 10.469 2.4096 10.517 2.5728C10.709 3.2064 10.8002 3.8544 10.7906 4.5168C10.781 5.1792 10.6754 5.8224 10.4738 6.4464C10.4258 6.6096 10.4378 6.7656 10.5098 6.9144C10.5818 7.0632 10.697 7.1616 10.8554 7.2096C11.0138 7.2576 11.1674 7.2432 11.3162 7.1664C11.465 7.0896 11.5634 6.9744 11.6114 6.8208ZM7.37782 9.7728C7.25302 9.888 7.19062 10.0296 7.19062 10.1976C7.19062 10.3656 7.25302 10.5072 7.37782 10.6224L8.57302 11.8176C8.68822 11.9424 8.82982 12.0048 8.99782 12.0048C9.16582 12.0048 9.30742 11.9448 9.42262 11.8248C9.53782 11.7048 9.59542 11.5632 9.59542 11.4C9.59542 11.2368 9.53782 11.0976 9.42262 10.9824L8.21302 9.7728C8.09782 9.6576 7.95862 9.6 7.79542 9.6C7.63222 9.6 7.49302 9.6576 7.37782 9.7728ZM8.57302 11.8176C8.68822 11.9424 8.82982 12.0048 8.99782 12.0048C9.16582 12.0048 9.30742 11.9424 9.42262 11.8176L11.813 9.4272C11.9378 9.312 12.0002 9.1704 12.0002 9.0024C12.0002 8.8344 11.9402 8.6928 11.8202 8.5776C11.7002 8.4624 11.5586 8.4048 11.3954 8.4048C11.2322 8.4048 11.093 8.4624 10.9778 8.5776L8.57302 10.9824C8.45782 11.0976 8.40022 11.2368 8.40022 11.4C8.40022 11.5632 8.45782 11.7024 8.57302 11.8176Z" fill="white" fillOpacity="0.8"/>
    </svg>
  );
}

export default function FintechFinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/fintech/hero-bg.png"
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#080d1a]/70" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Fintech · ZoikoVertex</span>
        </div>

        <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-white mb-6">
          Financial marketing that moves fast and stands up to scrutiny.
        </h2>

        <p className="text-white/55 text-[15px] leading-relaxed max-w-2xl mx-auto mb-10">
          ZoikoVertex helps FinTech marketing teams move faster on product launches, promotional campaigns, and regulatory communications — with claims review, compliance routing, and audit evidence built into every workflow.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
          >
            <Calendar className="w-4 h-4" />
            Request an Enterprise Demo
          </Link>
          <Link
            href="/governance"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-sm font-medium text-white/80 hover:bg-white/5 transition"
          >
            <GovernanceIcon className="w-3 h-3" />
            Explore Governance
          </Link>
        </div>

        <p className="text-white/30 text-[12px] font-mono">
          For fintech enterprise teams, agencies, and governance-led marketing departments.
        </p>
      </div>
    </section>
  );
}
