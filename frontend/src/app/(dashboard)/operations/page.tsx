import { redirect } from "next/navigation";

// The Agent Operations control room is served from the canonical
// /agents/operations route. The former /operations implementation was a
// duplicate of the same control room over the same APIs; this route now
// redirects to the single source of truth.
export default function OperationsPage() {
  redirect("/agents/operations");
}
