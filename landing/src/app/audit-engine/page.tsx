import {
  AuditEngineHeroSection,
  AuditEngineLayersStrip,
  AuditEngineArchitectureSection,
  AuditEngineScenarioSection,
  AuditEngineDeepDiveSection,
  AuditEngineEventTypesSection,
  AuditEngineBusinessValueSection,
  AuditEngineRolesSection,
  AuditEngineFAQSection,
} from "@/components/audit-engine";

export const metadata = {
  title: "Audit Engine | ZoikoVertex",
  description:
    "A five-layer evidence architecture built into every governed workflow — Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger. Every AI action, approval, and decision completely traceable.",
  alternates: {
    canonical: "https://www.zoikovertex.com/audit-engine",
  },
};

export default function AuditEnginePage() {
  return (
    <main>
      <AuditEngineHeroSection />
      <AuditEngineLayersStrip />
      <AuditEngineArchitectureSection />
      <AuditEngineScenarioSection />
      <AuditEngineDeepDiveSection />
      <AuditEngineEventTypesSection />
      <AuditEngineBusinessValueSection />
      <AuditEngineRolesSection />
      <AuditEngineFAQSection />
    </main>
  );
}
