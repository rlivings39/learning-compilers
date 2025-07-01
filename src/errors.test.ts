import { test, expect } from "vitest";
import { NotccError } from "./errors";

test("NotccError test", () => {
  const msg = "A message";
  const ncce = new NotccError(msg);
  expect(ncce.message).toBe(msg);
  expect(ncce.stack).not.toBeUndefined();
});
