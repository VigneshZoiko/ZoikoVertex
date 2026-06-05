import { redirect } from "next/navigation";

/**
 * Intermediate redirect to prevent 404 on /evidence/forensic-hub/cases.
 * Since the case list is integrated into the main Forensic Hub dashboard,
 * we redirect users there.
 */
export default function ForensicCasesIndexPage() {
  redirect("/evidence/forensic-hub");
}
