import { expect } from "vitest";
import { parse } from "./parse";
import { lex } from "./lex";
import { prettyPrint } from "./pretty-print";
import * as ast from "./ast";
import * as tacky from "./tacky";
import { runSemanticAnalysis } from "./semantics";
import { astToTacky } from "./ast-to-tacky";
import { prettyPrintTacky } from "./pretty-print-tacky";

function prettyPrintMatcher<T extends ast.Program | tacky.Program>(
  parser: (code: string) => T,
  printer: (astOrTacky: T) => string,
  codeOrAst: string | T,
  expected: string,
  isNot: boolean
) {
  if (typeof codeOrAst === "string") {
    codeOrAst = parser(codeOrAst);
  }
  const pp = printer(codeOrAst).trim();
  expected = expected.trim();
  const pass = pp === expected;
  return {
    pass,
    message: () => `Pretty print ${isNot ? "matched" : "did not match"}`,
    actual: pp,
    expected,
  };
}
// Custom matchers for Vitest
//   https://vitest.dev/guide/extending-matchers
expect.extend({
  /**
   * Given C code or a parsed ast, ensure that the pretty print matches the expected value
   * @param codeOrAst
   * @param expected
   * @returns
   */
  toHavePrettyPrint(codeOrAst: string | ast.Program, expected: string) {
    return prettyPrintMatcher(
      (c: string) => parse(lex(c)),
      prettyPrint,
      codeOrAst,
      expected,
      this.isNot
    );
  },
  toHaveTackyPrettyPrint(codeOrAst: string | tacky.Program, expected: string) {
    return prettyPrintMatcher(
      (c: string) => astToTacky(runSemanticAnalysis(parse(lex(c)))),
      prettyPrintTacky,
      codeOrAst,
      expected,
      this.isNot
    );
  },
});
