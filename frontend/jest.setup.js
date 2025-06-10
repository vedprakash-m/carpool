require("@testing-library/jest-dom");

// Fix TextEncoder/TextDecoder for MSW
require("text-encoding-polyfill");
global.TextDecoder = global.TextDecoder || require("util").TextDecoder;
global.TextEncoder = global.TextEncoder || require("util").TextEncoder;

// Mock Response for MSW
if (!global.Response) {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || "OK";
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    json() {
      return Promise.resolve(
        typeof this.body === "string" ? JSON.parse(this.body) : this.body
      );
    }

    text() {
      return Promise.resolve(
        typeof this.body === "string" ? this.body : JSON.stringify(this.body)
      );
    }
  };
}

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3001";
