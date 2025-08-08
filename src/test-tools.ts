import { expect } from "vitest";
import { parse } from "./parse";
import { lex } from "./lex";
import { prettyPrint } from "./pretty-print";
import * as ast from "./ast";

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
    const { isNot } = this;
    if (typeof codeOrAst === "string") {
      codeOrAst = parse(lex(codeOrAst));
    }
    const pp = prettyPrint(codeOrAst).trim();
    expected = expected.trim();
    const pass = pp === expected;
    return {
      pass,
      message: () =>
        `Pretty print ${
          isNot ? "matched" : "did not match"
        } from the code ${codeOrAst}`,
      actual: pp,
      expected,
    };
  },
});
