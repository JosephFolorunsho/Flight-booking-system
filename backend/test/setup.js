require("dotenv").config({ path: ".env.test" });

jest.setTimeout(30000);

// Mock logger
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
