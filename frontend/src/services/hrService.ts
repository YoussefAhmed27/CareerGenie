// @ts-nocheck
// ── HR API Service ─────────────────────────────────────────────────────────
// All calls go through the existing auth pattern: Bearer token + CSRF for mutations

const getHrToken = () => localStorage.getItem("hr_token");
const API_BASE_URL = (import.meta.env.VITE_NODE_URL || "").replace(/\/+$/, "");
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function getCsrf() {
  const res = await fetch(apiUrl("/auth/csrf"), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to get CSRF token");
  const { csrfToken } = await res.json();
  return csrfToken;
}

function hrAuthHeaders(extra = {}) {
  return { Authorization: `Bearer ${getHrToken()}`, ...extra };
}

async function hrMutationHeaders() {
  const csrf = await getCsrf();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getHrToken()}`,
    "X-CSRF-Token": csrf,
  };
}

// ── HR AUTH ──────────────────────────────────────────────────────────────
export async function registerHr(data: any) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl("/auth/hr/register"), {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Registration failed");
  const result = await res.json();
  localStorage.setItem("hr_token", result.accessToken);
  localStorage.setItem("hr_user", JSON.stringify(result.hrUser));
  return result;
}

export async function loginHr(data: any) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl("/auth/hr/login"), {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Login failed");
  const result = await res.json();
  localStorage.setItem("hr_token", result.accessToken);
  localStorage.setItem("hr_user", JSON.stringify(result.hrUser));
  return result;
}

export async function logoutHr() {
  const csrf = await getCsrf();
  await fetch(apiUrl("/auth/hr/logout"), { 
    method: "POST", 
    headers: { "X-CSRF-Token": csrf },
    credentials: "include" 
  });
  localStorage.removeItem("hr_token");
  localStorage.removeItem("hr_user");
}

// ── WORKSPACE ──────────────────────────────────────────────────────────────
export async function fetchWorkspace() {
  const res = await fetch(apiUrl("/api/hr/workspace"), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (res.status === 401) throw new Error("401 Unauthorized");
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch workspace");
  return res.json();
}

export async function createWorkspace(name: string) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl("/api/hr/workspace"), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to create workspace");
  return res.json();
}

export async function removeMember(workspaceId: number, memberId: number) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/workspace/${workspaceId}/members/${memberId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getHrToken()}`, "X-CSRF-Token": csrf },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to remove member");
  return res.json();
}

// ── STATS ──────────────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const res = await fetch(apiUrl("/api/hr/stats"), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// ── JOBS ───────────────────────────────────────────────────────────────────
export async function fetchJobs() {
  const res = await fetch(apiUrl("/api/hr/jobs"), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function createJob(data: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl("/api/hr/jobs"), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to create job");
  return res.json();
}

export async function updateJobStatus(jobId: number, status: string) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/jobs/${jobId}/status`), {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to update job status");
  return res.json();
}

export async function deleteJob(jobId: number) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/jobs/${jobId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getHrToken()}`, "X-CSRF-Token": csrf },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

// ── CANDIDATES ─────────────────────────────────────────────────────────────
export async function fetchCandidates(jobId: number) {
  const res = await fetch(apiUrl(`/api/hr/jobs/${jobId}/candidates`), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function addCandidate(jobId: number, data: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/jobs/${jobId}/candidates`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add candidate");
  return res.json();
}

export async function updateCandidate(candidateId: number, data: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}`), {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update candidate");
  return res.json();
}

export async function deleteCandidate(candidateId: number) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getHrToken()}`, "X-CSRF-Token": csrf },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete candidate");
  return res.json();
}

export async function hireCandidate(candidateId: number) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}/hire`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to hire candidate");
  return res.json();
}

export async function scheduleAIInterview(candidateId: number, window: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}/schedule-ai`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(window),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to schedule AI interview");
  return res.json();
}

export async function rejectCandidate(candidateId: number) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}/reject`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to reject candidate");
  return res.json();
}

export async function fetchAIInterviewResult(candidateId: number) {
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}/ai-result`), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch AI interview result");
  return res.json();
}

export async function createLiveInterviewRoom(candidateId: number, data: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/candidates/${candidateId}/live-rooms`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to create live room");
  return res.json();
}

export async function fetchLiveInterviewRooms() {
  const res = await fetch(apiUrl("/api/hr/live-rooms"), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch live rooms");
  return res.json();
}

export async function fetchLiveInterviewRoom(roomId: number | string) {
  const res = await fetch(apiUrl(`/api/hr/live-rooms/${roomId}`), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch live room");
  return res.json();
}

export async function startLiveInterviewRoom(roomId: number | string) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/live-rooms/${roomId}/start`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to start live room");
  return res.json();
}

export async function endLiveInterviewRoom(roomId: number | string) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/live-rooms/${roomId}/end`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to end live room");
  return res.json();
}

export async function fetchPublicLiveInterviewRoom(token: string) {
  const res = await fetch(apiUrl(`/api/hr/public/live-interviews/${token}`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to load live interview room");
  return res.json();
}

export async function fetchPublicAIInterviewInvite(token: string) {
  const res = await fetch(apiUrl(`/api/hr/public/ai-interviews/${token}`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to load interview invitation");
  return res.json();
}

export async function fetchWorkspaceInvitation(token: string) {
  const res = await fetch(apiUrl(`/api/hr/public/workspace-invitations/${token}`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to load workspace invitation");
  return res.json();
}

export async function markPublicAIInterviewStarted(token: string, data: any) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/public/ai-interviews/${token}/start`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to mark interview started");
  return res.json();
}

export async function savePublicAIInterviewResult(token: string, data: any) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/public/ai-interviews/${token}/result`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to save HR interview result");
  return res.json();
}

export async function uploadCVs(jobId: number, formData: FormData) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/jobs/${jobId}/upload-cvs`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getHrToken()}`,
      "X-CSRF-Token": csrf,
    },
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload CVs");
  return res.json();
}

export async function inviteMember(workspaceId: number, data: any) {
  const headers = await hrMutationHeaders();
  const res = await fetch(apiUrl(`/api/hr/workspace/${workspaceId}/invitations`), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to invite member");
  return res.json();
}

export async function fetchWorkspaceInvitations(workspaceId: number) {
  const res = await fetch(apiUrl(`/api/hr/workspace/${workspaceId}/invitations`), {
    headers: hrAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch invitations");
  return res.json();
}

export async function cancelWorkspaceInvitation(workspaceId: number, inviteId: number) {
  const csrf = await getCsrf();
  const res = await fetch(apiUrl(`/api/hr/workspace/${workspaceId}/invitations/${inviteId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getHrToken()}`, "X-CSRF-Token": csrf },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to cancel invitation");
  return res.json();
}


