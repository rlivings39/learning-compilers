import { expect, test } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import { prettyPrint } from "./pretty-print";
import { runSemanticAnalysis } from "./semantics";

test("Variable resolution", () => {
  const main = `int main(void) {
    int x = 0;
    int y;
    y = 2 + x;
    return !x + 3*y;
  }`;
  const ast = parse(lex(main));
  runSemanticAnalysis(ast);
  expect(prettyPrint(ast).trim()).toEqual(
    `
Program (
  Function main() {
    Declaration (x.0,0);
    Declaration (y.1);
    =(y.1, plus(2, x.0));
    return plus(!(x.0), multiply(3, y.1));
  }
)
    `.trim()
  );

  const mainDuplicate = `int main(void) {
    int x = 0;
    int x;
    return x;
  }`;
  const astDuplicate = parse(lex(mainDuplicate));
  expect(() => runSemanticAnalysis(astDuplicate)).toThrowError(
    /already defined/
  );

  const mainUndefined = `int main(void) {
    return x;
  }`;
  const astUndefined = parse(lex(mainUndefined));
  expect(() => runSemanticAnalysis(astUndefined)).toThrowError(/not find/);

  const mainNonLvalue = `int main(void) {
    2 = 3;
    return 0;
  }`;
  const astNonLvalue = parse(lex(mainNonLvalue));
  expect(() => runSemanticAnalysis(astNonLvalue)).toThrowError(/Non-lvalue/);
});
