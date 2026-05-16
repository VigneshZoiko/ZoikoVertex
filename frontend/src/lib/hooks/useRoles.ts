import { useRoleContext } from "../context/RoleContext";

/**
 * Hook to consume the centralized RoleContext.
 * This ensures that role fetching happens only once at the root level.
 */
export function useRoles() {
  const { role, isSuperAdmin, hasRole, isLoading } = useRoleContext();
  
  return { 
    role, 
    isSuperAdmin, 
    hasRole, 
    isLoading 
  };
}
