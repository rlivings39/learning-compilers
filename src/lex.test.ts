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

  expect(lex("(  )\n")).toEqual([
    {
      kind: TokenKind.LEFT_PAREN,
    },
    {
      kind: TokenKind.RIGHT_PAREN,
    },
  ]);

  expect(lex("int x;")).toEqual([
    { kind: TokenKind.KW_INT },
    { kind: TokenKind.IDENTIFIER, id: "x" },
    { kind: TokenKind.SEMICOLON },
  ]);

  expect(lex("  int    x\n\n  ;")).toEqual([
    { kind: TokenKind.KW_INT },
    { kind: TokenKind.IDENTIFIER, id: "x" },
    { kind: TokenKind.SEMICOLON },
  ]);

  const mainProg = `
  int main  (  void  \n) {
    return \n\n2;
  }`;
  expect(lex(mainProg)).toEqual([
    { kind: TokenKind.KW_INT },
    { kind: TokenKind.IDENTIFIER, id: "main" },
    { kind: TokenKind.LEFT_PAREN },
    { kind: TokenKind.KW_VOID },
    { kind: TokenKind.RIGHT_PAREN },
    { kind: TokenKind.LEFT_CURLY },
    { kind: TokenKind.KW_RETURN },
    { kind: TokenKind.INT_CONSTANT, value: 2 },
    { kind: TokenKind.SEMICOLON },
    { kind: TokenKind.RIGHT_CURLY },
  ]);
  expect(lex("//comment\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  expect(lex("/*comment*/\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  expect(() => lex("12ab")).toThrow();
});

test("Lex unary ops", () => {
  expect(lex("-")).toMatchObject([{ kind: TokenKind.UNARY_MINUS }]);
  expect(lex("--")).toMatchObject([{ kind: TokenKind.DECREMENT }]);
  expect(lex("~~x")).toMatchObject([
    { kind: TokenKind.UNARY_BITWISE_COMPLEMENT },
    { kind: TokenKind.UNARY_BITWISE_COMPLEMENT },
    { kind: TokenKind.IDENTIFIER },
  ]);
});
