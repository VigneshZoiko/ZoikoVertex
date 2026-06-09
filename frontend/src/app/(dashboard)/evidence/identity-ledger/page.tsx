"use client";

import dynamic from 'next/dynamic';

const IdentityLedgerPage = dynamic(
  () => import('@/app/(dashboard)/integrations/identity-ledger/page'),
  { ssr: false }
);

export default function EvidenceIdentityLedgerPage() {
  return <IdentityLedgerPage />;
}
