import "vitest";

interface CustomMatchers<R = unknown> {
  toHavePrettyPrint: (expected: string) => R;
}

declare module "vitest" {
  interface Matchers<T = unknown> extends CustomMatchers<T> {
    // Add a property to make eslint be quiet
    _;
  }
}
