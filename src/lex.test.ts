import { test, expect } from "vitest";
import { lex, TokenKind, forTestingOnly } from "./lex";

const stripComments = (s: string) => {
  let sbuf = Array.from(s);
  forTestingOnly.stripComments(sbuf);
  return sbuf.join("");
};

test("Comment handling", () => {
  expect(stripComments("// Comment\nfoo()")).toEqual("          \nfoo()");
  expect(stripComments("//f\nfoo()")).toEqual("   \nfoo()");
  expect(stripComments("///*")).toEqual("    ");
  expect(stripComments("/*//\n*/()")).toEqual("    \n  ()");
  expect(stripComments("foo()")).toEqual("foo()");
  expect(stripComments("")).toEqual("");
  expect(stripComments("  \n")).toEqual("  \n");
  expect(stripComments("// ")).toEqual("   ");
  expect(stripComments("a / b")).toEqual("a / b");
  expect(() => stripComments("/* adsf")).toThrow();
  const blockComment = `
  /* here is a
  block comment
  */
 foo()`;
  const cleanedBlockComment = `\n              \n               \n    \n foo()`;
  expect(stripComments(blockComment)).toEqual(cleanedBlockComment);
});

test("Lex token tests", () => {
  expect(lex("")).toEqual([]);
  expect(lex("   ")).toEqual([]);
  expect(lex(" \n\n   ")).toEqual([]);
  expect(lex("(\n")).toEqual([
    {
      kind: TokenKind.LEFT_PAREN,
    },
  ]);

  // TODO comments fail lexer
  expect(lex("//comment\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  expect(lex("/*comment*/\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  // TODO verify locations later
  expect(() => lex("12ab")).toThrow();
});
