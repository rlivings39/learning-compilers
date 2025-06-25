import { test, expect } from "vitest";
import { lex, TokenKind } from "./lex";

test("Lex token tests", () => {
  expect(lex("")).toEqual([]);
  expect(lex("(")).toEqual([
    {
      kind: TokenKind.LEFT_PAREN,
    },
  ]);

  // TODO verify locations later
  expect(() => lex("12ab")).toThrow();
});
