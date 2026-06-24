import { useRoleContext } from "@/lib/context/RoleContext";

export function useRoles() {
  const { role, isSuperAdmin, hasRole, isLoading } = useRoleContext();
  return { role, isSuperAdmin, hasRole, isLoading };
}
