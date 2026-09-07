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
  title: "AI Auditability Platform | ZoikoVertex",
  description:
    "ZoikoVertex delivers AI auditability with immutable audit trails, approval evidence, policy history, role tracking, and complete records of every AI action.",
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
