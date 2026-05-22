"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GovernanceAuditRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/evidence/audit-trail");
  }, [router]);
  return (
    <div className="p-8 text-[#888] flex items-center gap-2">
      <span className="animate-pulse">Redirecting to Audit Trail...</span>
    </div>
  );
}
