import "vitest";

interface CustomMatchers<R = unknown> {
  /**
   * Given C code or a parsed ast, ensure that the pretty print matches the expected value
   */
  toHavePrettyPrint: (expected: string) => R;
  toHaveTackyPrettyPrint: (expected: string) => R;
}

declare module "vitest" {
  interface Matchers<T = unknown> extends CustomMatchers<T> {
    // Add a property to make eslint be quiet
    _;
  }
}
