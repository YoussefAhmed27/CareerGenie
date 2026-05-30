import { describe, it, expect, vi, beforeEach } from "vitest";
import { textToVisemes } from "../interview_module/utils/visemeMapper.js";

const mocks = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    apiGetMock: vi.fn(),
    authGetMock: vi.fn(),
  };
});

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn((config) => {
        if (config?.baseURL?.includes("/api")) {
          return {
            get: mocks.authGetMock,
            post: vi.fn(),
          };
        }

        return {
          post: mocks.apiPostMock,
          get: mocks.apiGetMock,
        };
      }),
    },
  };
});

import {
  startSession,
  executeCode,
  getPistonRuntimes,
  getInterviewFeedback,
} from "../interview_module/api/interviewService.js";

describe("CareerGenie frontend unit/component tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts normal text into a non-empty viseme sequence", () => {
    const result = textToVisemes("hello world");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("inserts a rest viseme after punctuation", () => {
    const result = textToVisemes("hello, world");
    expect(result).toContain("rest");
  });

  it("returns an empty viseme sequence for numeric-only text", () => {
    const result = textToVisemes("12345");
    expect(result).toEqual([]);
  });

  it("does not create consecutive duplicate visemes", () => {
    const result = textToVisemes("hello world");

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).not.toBe(result[i - 1]);
    }
  });

  it("starts an AI interview session and returns the session id", async () => {
    mocks.apiPostMock.mockResolvedValueOnce({
      data: { session_id: "session_123" },
    });

    const sessionId = await startSession(
      "Candidate CV text",
      "Backend developer job description",
      "aura-2-odysseus-en",
      "Backend Developer"
    );

    expect(mocks.apiPostMock).toHaveBeenCalledWith("/start_session", {
      cv_text: "Candidate CV text",
      jd_text: "Backend developer job description",
      voice_id: "aura-2-odysseus-en",
      job_role: "Backend Developer",
    });

    expect(sessionId).toBe("session_123");
  });

  it("throws a readable error when session start fails", async () => {
    mocks.apiPostMock.mockRejectedValueOnce({
      response: { data: { detail: "Session failed" } },
    });

    await expect(
      startSession("CV", "JD", "voice", "Role")
    ).rejects.toThrow("Session failed");
  });

  it("executes code through the AI backend service", async () => {
    mocks.apiPostMock.mockResolvedValueOnce({
      data: {
        stdout: "hello",
        stderr: "",
        output: "hello",
        exit_code: 0,
      },
    });

    const result = await executeCode({
      language: "python",
      version: "3.10.0",
      code: "print('hello')",
      stdin: "",
    });

    expect(mocks.apiPostMock).toHaveBeenCalledWith("/execute_code", {
      language: "python",
      version: "3.10.0",
      code: "print('hello')",
      stdin: "",
    });

    expect(result.output).toBe("hello");
    expect(result.exit_code).toBe(0);
  });

  it("throws a readable error when code execution fails", async () => {
    mocks.apiPostMock.mockRejectedValueOnce({
      response: { data: { detail: "Code execution failed" } },
    });

    await expect(
      executeCode({
        language: "python",
        version: "3.10.0",
        code: "print(1/0)",
        stdin: "",
      })
    ).rejects.toThrow("Code execution failed");
  });

  it("fetches supported Piston runtimes", async () => {
    mocks.apiGetMock.mockResolvedValueOnce({
      data: [{ language: "python", version: "3.10.0" }],
    });

    const result = await getPistonRuntimes();

    expect(mocks.apiGetMock).toHaveBeenCalledWith("/piston_runtimes");
    expect(result[0].language).toBe("python");
  });

  it("requests interview feedback using the session id", async () => {
    mocks.apiPostMock.mockResolvedValueOnce({
      data: { overall_score: 8.2 },
    });

    const result = await getInterviewFeedback("session_123");

    expect(mocks.apiPostMock).toHaveBeenCalledWith("/get_feedback", {
      session_id: "session_123",
    });

    expect(result.overall_score).toBe(8.2);
  });
});