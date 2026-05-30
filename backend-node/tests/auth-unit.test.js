const { validateRegister, validateLogin } = require("../src/validators/auth.validators");

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { requireAuth } = require("../src/middleware/auth");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("CareerGenie Node.js auth validator unit tests", () => {
  test("validateRegister accepts a valid registration payload", () => {
    const result = validateRegister({
      full_name: "Test Candidate",
      email: "candidate@example.com",
      password: "Test123",
    });

    expect(result).toBeNull();
  });

  test("validateRegister rejects missing body", () => {
    expect(validateRegister(null)).toBe("Body is required");
  });

  test("validateRegister rejects missing full name", () => {
    const result = validateRegister({
      email: "candidate@example.com",
      password: "Test123",
    });

    expect(result).toBe("full_name is required");
  });

  test("validateRegister rejects invalid email", () => {
    const result = validateRegister({
      full_name: "Test Candidate",
      email: "invalid-email",
      password: "Test123",
    });

    expect(result).toBe("valid email is required");
  });

  test("validateRegister rejects short password", () => {
    const result = validateRegister({
      full_name: "Test Candidate",
      email: "candidate@example.com",
      password: "123",
    });

    expect(result).toBe("password must be at least 6 chars");
  });

  test("validateLogin accepts a valid login payload", () => {
    const result = validateLogin({
      email: "candidate@example.com",
      password: "Test123",
    });

    expect(result).toBeNull();
  });

  test("validateLogin rejects missing password", () => {
    const result = validateLogin({
      email: "candidate@example.com",
    });

    expect(result).toBe("password is required");
  });

  test("requireAuth rejects request with missing token", () => {
    const req = { headers: {} };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("requireAuth rejects invalid token", () => {
    jwt.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    const req = {
      headers: { authorization: "Bearer invalid-token" },
    };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("requireAuth accepts valid token and attaches candidate_id", () => {
    jwt.verify.mockReturnValueOnce({ candidate_id: 7 });

    const req = {
      headers: { authorization: "Bearer valid-token" },
    };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.user).toEqual({ candidate_id: 7 });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});