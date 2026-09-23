import { Eye, IdCard, KeyRound, Network, Shield, Users, type LucideIcon } from "lucide-react";
import { CONTAINER, Eyebrow, IconTile, Pill, SectionLede, SectionTitle } from "./shared";

const CONTROLS: { icon: LucideIcon; title: string; body: string; tags: string[] }[] = [
  {
    icon: KeyRound,
    title: "Single Sign-On (SSO)",
    body: "Enterprise SSO integration via SAML 2.0 and OIDC — supporting Okta, Microsoft Azure AD, Google Workspace, Ping Identity, OneLogin, and any SAML 2.0 compliant identity provider. SSO enforcement available for enterprise tenants.",
    tags: ["SAML 2.0", "OIDC", "Okta", "Azure AD", "Google Workspace"],
  },
  {
    icon: Users,
    title: "SCIM User Provisioning",
    body: "Automated user provisioning and deprovisioning via SCIM 2.0 — ensuring accounts are created, updated, and deactivated in line with HR system changes and offboarding processes. Reduces manual access management risk.",
    tags: ["SCIM 2.0", "Auto-provisioning", "Auto-deprovisioning"],
  },
  {
    icon: Shield,
    title: "Multi-Factor Authentication",
    body: "MFA enforced for all user accounts. Supported methods: TOTP authenticator apps, hardware security keys (FIDO2/WebAuthn), and push notifications. MFA bypass controls for emergency access with full audit logging.",
    tags: ["TOTP", "FIDO2/WebAuthn", "Hardware keys", "Push notifications"],
  },
  {
    icon: Network,
    title: "Role-Based Access Control (RBAC)",
    body: "Granular permission scoping by role, workspace, brand, region, campaign type, and data sensitivity. Predefined roles: Executive, Marketing Lead, Reviewer, Approver, Compliance, Agency, Auditor, Admin. Custom roles on Enterprise tier.",
    tags: ["Workspace isolation", "Brand scoping", "Regional scoping", "Sensitivity levels"],
  },
  {
    icon: Eye,
    title: "Session Management",
    body: "Configurable session timeout policies, concurrent session limits, IP allowlisting for enterprise tenants, device trust controls, and automatic session revocation on password change or security event detection.",
    tags: ["Configurable timeout", "IP allowlisting", "Device trust", "Session revocation"],
  },
  {
    icon: IdCard,
    title: "Privileged Access Management",
    body: "All ZoikoVertex engineering and operations production access controlled through a PAM system with just-in-time access provisioning, session recording for privileged sessions, and dual-approval for critical operations. All access logged in the Identity Ledger.",
    tags: ["Just-in-time access", "Session recording", "Dual approval", "Identity Ledger logging"],
  },
];

export default function TrustCenterAccessControl() {
  return (
    <section id="access-control" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Access Control &amp; Identity</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Enterprise identity controls that meet the requirements of
        security-conscious organisations.
      </SectionTitle>
      <SectionLede>
        ZoikoVertex implements layered identity and access management — from
        enterprise SSO integration through role-based permission scoping to
        privileged access controls for platform administration.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONTROLS.map(({ icon, title, body, tags }) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-[#0b1120] p-6">
            <IconTile icon={icon} />
            <h3 className="mt-5 text-[15px] font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
              {title}
            </h3>
            <p className="mt-2 text-[13px] font-light leading-[1.55] text-white/50">{body}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Pill key={tag} className="rounded-md text-[9.5px]">
                  {tag}
                </Pill>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
