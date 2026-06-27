import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosMocks = vi.hoisted(() => ({
  post: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ post: axiosMocks.post })),
    isAxiosError: axiosMocks.isAxiosError,
  },
}));

import {
  analyzeCv,
  generateCvFromScratch,
  getGeneratedCvDownloadUrl,
  getTailoredCvDownloadUrl,
  tailorCv,
} from "../api/cvService";
import {
  createJob,
  deleteCandidate,
  fetchPublicAIInterviewInvite,
  fetchWorkspace,
  loginHr,
  logoutHr,
  markPublicAIInterviewStarted,
  registerHr,
  savePublicAIInterviewResult,
  scheduleAIInterview,
  uploadCVs,
} from "../services/hrService";

const makeFile = () => new Blob(["cv"], { type: "application/pdf" }) as File;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
});

describe("CV service client", () => {
  beforeEach(() => {
    axiosMocks.post.mockReset();
    axiosMocks.isAxiosError.mockReset();
  });

  it("posts CV analysis uploads to the analysis endpoint", async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: { overall_cv_score: 88 } });

    const result = await analyzeCv(makeFile(), " React role ");

    expect(result).toEqual({ overall_cv_score: 88 });
    expect(axiosMocks.post).toHaveBeenCalledWith("/cv/upload", expect.any(FormData));
    expect(axiosMocks.post.mock.calls[0][1].get("jd_text")).toBe("React role");
  });

  it("omits blank job descriptions from analysis uploads", async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: { ok: true } });

    await analyzeCv(makeFile(), "   ");

    expect(axiosMocks.post.mock.calls[0][1].has("jd_text")).toBe(false);
  });

  it("posts tailoring uploads to the tailor endpoint", async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: { cv_id: "tailor-1" } });

    const result = await tailorCv(makeFile(), "Node role");

    expect(result).toEqual({ cv_id: "tailor-1" });
    expect(axiosMocks.post).toHaveBeenCalledWith("/tailor/upload", expect.any(FormData));
  });

  it("builds encoded tailored CV download URLs", () => {
    expect(getTailoredCvDownloadUrl("cv 1/2", "pdf")).toBe(
      "http://localhost:8010/tailor/download/pdf?cv_id=cv%201%2F2",
    );
  });

  it("posts structured profile data for CV generation", async () => {
    const payload = { structured: { name: "Maya", skills: ["React"] }, extra_info: "projects" } as any;
    axiosMocks.post.mockResolvedValueOnce({ data: { cv_id: "generated-1" } });

    const result = await generateCvFromScratch(payload);

    expect(result).toEqual({ cv_id: "generated-1" });
    expect(axiosMocks.post).toHaveBeenCalledWith("/generation/generate", payload);
  });

  it("builds encoded generated CV download URLs", () => {
    expect(getGeneratedCvDownloadUrl("generated id", "docx")).toBe(
      "http://localhost:8010/generation/download/docx?cv_id=generated%20id",
    );
  });

  it("surfaces CV service detail errors", async () => {
    axiosMocks.isAxiosError.mockReturnValue(true);
    axiosMocks.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: "Invalid CV file" } },
    });

    await expect(analyzeCv(makeFile(), "")).rejects.toThrow("Invalid CV file");
  });

  it("surfaces CV service error messages", async () => {
    axiosMocks.isAxiosError.mockReturnValue(true);
    axiosMocks.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: "Tailoring failed" } },
    });

    await expect(tailorCv(makeFile(), "jd")).rejects.toThrow("Tailoring failed");
  });

  it("uses fallback text when CV service errors are unstructured", async () => {
    axiosMocks.isAxiosError.mockReturnValue(true);
    axiosMocks.post.mockRejectedValueOnce({ isAxiosError: true, response: { data: {} } });

    await expect(generateCvFromScratch({ structured: {} as any, extra_info: "" })).rejects.toThrow(
      "Failed to generate CV.",
    );
  });

});

describe("HR service client", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("registers HR users with CSRF and included credentials", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-1" }) as any)
      .mockResolvedValueOnce(jsonResponse({ accessToken: "hr-token", hrUser: { id: 1 } }) as any);

    await registerHr({ email: "hr@example.com" });

    expect(fetch).toHaveBeenNthCalledWith(1, "/auth/csrf", { credentials: "include" });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/hr/register",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-1" }),
      }),
    );
    expect(storage.get("hr_token")).toBe("hr-token");
  });

  it("logs HR users in with CSRF and included credentials", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-2" }) as any)
      .mockResolvedValueOnce(jsonResponse({ accessToken: "login-token", hrUser: { id: 2 } }) as any);

    await loginHr({ email: "hr@example.com", password: "secret" });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/hr/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-2" }),
      }),
    );
    expect(storage.get("hr_token")).toBe("login-token");
  });

  it("fetches workspaces with bearer auth and credentials", async () => {
    storage.set("hr_token", "workspace-token");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ workspace: { id: 1 } }) as any);

    await fetchWorkspace();

    expect(fetch).toHaveBeenCalledWith(
      "/api/hr/workspace",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ Authorization: "Bearer workspace-token" }),
      }),
    );
  });

  it("creates jobs with JSON mutation headers", async () => {
    storage.set("hr_token", "job-token");
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-job" }) as any)
      .mockResolvedValueOnce(jsonResponse({ job: { id: 10 } }) as any);

    await createJob({ title: "Engineer" });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/hr/jobs",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer job-token",
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-job",
        }),
      }),
    );
  });

  it("uploads CV batches with auth and no JSON content type", async () => {
    storage.set("hr_token", "upload-token");
    const formData = new FormData();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-upload" }) as any)
      .mockResolvedValueOnce(jsonResponse({ uploaded: 2 }) as any);

    await uploadCVs(44, formData);

    const options = vi.mocked(fetch).mock.calls[1][1] as RequestInit & { headers: Record<string, string> };
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/hr/jobs/44/upload-cvs");
    expect(options.credentials).toBe("include");
    expect(options.headers.Authorization).toBe("Bearer upload-token");
    expect(options.headers["X-CSRF-Token"]).toBe("csrf-upload");
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBe(formData);
  });

  it("schedules AI interviews through the candidate endpoint", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-ai" }) as any)
      .mockResolvedValueOnce(jsonResponse({ invitation_url: "link" }) as any);

    await scheduleAIInterview(7, { start_time: "2026-06-12T10:00:00Z" });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/hr/candidates/7/schedule-ai",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("loads public AI interview invites with credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ token: "public-token" }) as any);

    await fetchPublicAIInterviewInvite("public-token");

    expect(fetch).toHaveBeenCalledWith("/api/hr/public/ai-interviews/public-token", {
      credentials: "include",
    });
  });

  it("marks public AI interviews started with CSRF and JSON body", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-public" }) as any)
      .mockResolvedValueOnce(jsonResponse({ ok: true }) as any);

    await markPublicAIInterviewStarted("tok", { session_id: "session-1" });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/hr/public/ai-interviews/tok/start",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-public" }),
        body: JSON.stringify({ session_id: "session-1" }),
      }),
    );
  });

  it("saves public AI interview results with CSRF and JSON body", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-result" }) as any)
      .mockResolvedValueOnce(jsonResponse({ saved: true }) as any);

    await savePublicAIInterviewResult("tok", { overall_score: 91 });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/hr/public/ai-interviews/tok/result",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-result" }),
      }),
    );
  });

  it("deletes HR candidates with auth and CSRF", async () => {
    storage.set("hr_token", "delete-token");
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-delete" }) as any)
      .mockResolvedValueOnce(jsonResponse({ deleted: true }) as any);

    await deleteCandidate(99);

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/hr/candidates/99",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer delete-token",
          "X-CSRF-Token": "csrf-delete",
        }),
      }),
    );
  });

  it("clears HR auth state on logout", async () => {
    storage.set("hr_token", "old-token");
    storage.set("hr_user", JSON.stringify({ id: 1 }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-logout" }) as any)
      .mockResolvedValueOnce(jsonResponse({ ok: true }) as any);

    await logoutHr();

    expect(storage.has("hr_token")).toBe(false);
    expect(storage.has("hr_user")).toBe(false);
  });
});
