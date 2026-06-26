const _raw = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CUSTOS_API_URL) || "https://zoikovertex.onrender.com";
export const API_BASE_URL = _raw.replace(/\/api\/?$/, "");

export const API_PATHS = {
  health: "/health",
  bootstrap: "/api/bootstrap",
  chatbot: "/api/chatbot",
  support: "/api/support",
  workspaceConfig: "/api/workspace-config",
  employeeSummary: "/api/employee-summary",
  history: "/api/history",
  adminOverview: "/api/admin/overview",
};

export function getApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
