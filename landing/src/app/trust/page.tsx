import TrustCenterHero from "@/components/trust-center/TrustCenterHero";
import TrustCenterPillars from "@/components/trust-center/TrustCenterPillars";
import TrustCenterSecurity from "@/components/trust-center/TrustCenterSecurity";
import TrustCenterCompliance from "@/components/trust-center/TrustCenterCompliance";
import TrustCenterPrivacy from "@/components/trust-center/TrustCenterPrivacy";
import TrustCenterResponsibleAI from "@/components/trust-center/TrustCenterResponsibleAI";
import TrustCenterAuditEngine from "@/components/trust-center/TrustCenterAuditEngine";
import TrustCenterAccessControl from "@/components/trust-center/TrustCenterAccessControl";
import TrustCenterInfrastructure from "@/components/trust-center/TrustCenterInfrastructure";
import TrustCenterSubprocessors from "@/components/trust-center/TrustCenterSubprocessors";
import TrustCenterDocuments from "@/components/trust-center/TrustCenterDocuments";
import TrustCenterFaq from "@/components/trust-center/TrustCenterFaq";
import { Divider } from "@/components/trust-center/shared";

export const metadata = {
  title: "Trust Center | ZoikoVertex",
  description:
    "Security, compliance, privacy, and AI governance for enterprise buyers — encryption, certifications, DPA, subprocessors, audit evidence, and trust documents in one place.",
};

export default function TrustCenterPage() {
  return (
    <main className="bg-[#080d1a]">
      <TrustCenterHero />
      <TrustCenterPillars />
      <TrustCenterSecurity />
      <Divider />
      <TrustCenterCompliance />
      <TrustCenterPrivacy />
      <TrustCenterResponsibleAI />
      <Divider />
      <TrustCenterAuditEngine />
      <Divider />
      <TrustCenterAccessControl />
      <TrustCenterInfrastructure />
      <TrustCenterSubprocessors />
      <Divider />
      <TrustCenterDocuments />
      <Divider />
      <TrustCenterFaq />
    </main>
  );
}
