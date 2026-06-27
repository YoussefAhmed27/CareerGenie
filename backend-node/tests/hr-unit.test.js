jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { requireHrAuth } = require("../src/middleware/auth");
const { csrfProtect, issueCsrf } = require("../src/middleware/csrf");

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  return res;
};

const makeReq = ({ method = "GET", path = "/", cookies = {}, headers = {} } = {}) => ({
  method,
  path,
  cookies,
  headers,
  get: jest.fn((name) => headers[name.toLowerCase()] || headers[name]),
});

describe("HR auth middleware", () => {
  beforeEach(() => {
    jwt.verify.mockReset();
  });

  test("rejects requests without an HR bearer token", () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    requireHrAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing HR token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects candidate tokens on HR routes", () => {
    jwt.verify.mockReturnValue({ candidate_id: 11 });
    const req = { headers: { authorization: "Bearer candidate-token" } };
    const res = makeRes();
    const next = jest.fn();

    requireHrAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid HR token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("attaches HR user identity for valid HR tokens", () => {
    jwt.verify.mockReturnValue({ hr_user_id: 4, email: "hr@example.com", domain: "example.com" });
    const req = { headers: { authorization: "Bearer hr-token" } };
    const res = makeRes();
    const next = jest.fn();

    requireHrAuth(req, res, next);

    expect(req.hrUser).toEqual({ id: 4, email: "hr@example.com", domain: "example.com" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("rejects invalid JWT payloads safely", () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("bad token");
    });
    const req = { headers: { authorization: "Bearer bad-token" } };
    const res = makeRes();
    const next = jest.fn();

    requireHrAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid HR token" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("CSRF middleware for HR endpoints", () => {
  test("allows GET requests without tokens", () => {
    const next = jest.fn();
    csrfProtect(makeReq({ method: "GET" }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("allows HEAD requests without tokens", () => {
    const next = jest.fn();
    csrfProtect(makeReq({ method: "HEAD" }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("allows OPTIONS preflight requests without tokens", () => {
    const next = jest.fn();
    csrfProtect(makeReq({ method: "OPTIONS" }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("exempts public AI interview start token endpoint", () => {
    const next = jest.fn();
    csrfProtect(
      makeReq({ method: "POST", path: "/api/hr/public/ai-interviews/token-123/start" }),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("exempts public AI interview result token endpoint", () => {
    const next = jest.fn();
    csrfProtect(
      makeReq({ method: "POST", path: "/api/hr/public/ai-interviews/token-123/result" }),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("does not exempt authenticated HR candidate mutations", () => {
    const res = makeRes();
    csrfProtect(makeReq({ method: "POST", path: "/api/hr/candidates/10/reject" }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("rejects missing CSRF tokens", () => {
    const res = makeRes();
    csrfProtect(makeReq({ method: "POST", path: "/api/hr/jobs" }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "CSRF token missing" });
  });

  test("rejects mismatched CSRF tokens", () => {
    const res = makeRes();
    csrfProtect(
      makeReq({
        method: "PATCH",
        path: "/api/hr/jobs/5/status",
        cookies: { csrf_token: "cookie-token" },
        headers: { "x-csrf-token": "header-token" },
      }),
      res,
      jest.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "CSRF token invalid" });
  });

  test("allows matching CSRF tokens", () => {
    const next = jest.fn();
    csrfProtect(
      makeReq({
        method: "DELETE",
        path: "/api/hr/jobs/5",
        cookies: { csrf_token: "same-token" },
        headers: { "x-csrf-token": "same-token" },
      }),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("issues local CSRF cookies with lax sameSite and secure false", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const res = makeRes();

    issueCsrf({}, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "csrf_token",
      expect.any(String),
      expect.objectContaining({ sameSite: "lax", secure: false, path: "/" }),
    );
    process.env.NODE_ENV = originalEnv;
  });
});

describe("HR email service providers", () => {
  const mockSendMail = jest.fn();
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  const loadEmailService = (env = {}) => {
    jest.resetModules();
    mockSendMail.mockReset();
    process.env = { ...originalEnv, ...env };
    jest.doMock("nodemailer", () => ({
      createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
    }));
    return require("../src/services/hrEmail.service");
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.dontMock("nodemailer");
  });

  test("skips email when the recipient is missing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const service = loadEmailService({ EMAIL_MODE: "console" });

    await expect(service.sendAIInterviewInvitationEmail({ job_title: "Engineer" })).resolves.toEqual({
      skipped: true,
      reason: "missing_recipient",
    });

    warnSpy.mockRestore();
  });

  test("preserves console email mode", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const service = loadEmailService({ EMAIL_MODE: "console" });

    await expect(
      service.sendAIInterviewInvitationEmail({
        candidate_email: "candidate@example.com",
        job_title: "Engineer",
        invitation_url: "https://example.com/invite",
      }),
    ).resolves.toEqual({ mode: "console" });

    logSpy.mockRestore();
  });

  test("preserves SMTP mode with Nodemailer", async () => {
    const service = loadEmailService({ EMAIL_MODE: "smtp", EMAIL_REPLY_TO: "reply@example.com" });
    mockSendMail.mockResolvedValueOnce({ messageId: "smtp-1" });

    const result = await service.sendLiveInterviewInvitationEmail({
      candidate_email: "candidate@example.com",
      job_title: "Engineer",
      room_url: "https://example.com/room",
    });

    expect(result).toEqual({ messageId: "smtp-1" });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "reply@example.com" }));
  });

  test("sends resend emails through native fetch", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: "resend-1" }),
    });
    const service = loadEmailService({
      EMAIL_MODE: "resend",
      RESEND_API_KEY: "secret-key",
      EMAIL_FROM: "CareerGenie <hr@example.com>",
      EMAIL_REPLY_TO: "reply@example.com",
    });

    await expect(
      service.sendHiringDecisionEmail({
        candidate_email: "candidate@example.com",
        job_title: "Engineer",
      }),
    ).resolves.toEqual({ id: "resend-1" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
      }),
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        from: "CareerGenie <hr@example.com>",
        to: "candidate@example.com",
        reply_to: "reply@example.com",
      }),
    );
  });

  test("surfaces resend response status and body on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue("invalid sender"),
    });
    const service = loadEmailService({ EMAIL_MODE: "resend", RESEND_API_KEY: "secret-key" });

    await expect(
      service.sendRejectionDecisionEmail({
        candidate_email: "candidate@example.com",
        job_title: "Engineer",
      }),
    ).rejects.toThrow("Resend email failed with status 422: invalid sender");
  });
});
