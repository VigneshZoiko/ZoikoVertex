"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GovernanceAuditEventRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params.id) {
      router.replace(`/evidence/audit-trail/events/${params.id}`);
    }
  }, [router, params.id]);
  return (
    <div className="p-8 text-[#888] flex items-center gap-2">
      <span className="animate-pulse">Redirecting to Audit Event...</span>
    </div>
  );
}
