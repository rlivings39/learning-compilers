import { expect, test } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import { runSemanticAnalysis } from "./semantics";
import "./test-tools";

test("Variable resolution", () => {
  const main = `int main(void) {
    int x = 0;
    int y;
    y = 2 + x;
    return !x + 3*y;
  }`;
  const ast = runSemanticAnalysis(parse(lex(main)));
  expect(ast).toHavePrettyPrint(
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

test("Variable resolution if/conditional", () => {
  const main = `
  int main(void) {
    int v = -2;
    int w = -1;
    int x = 0;
    int y = 1;
    int z = 2;
    if (w + 1)
      return x ? y : z;
    else
      return v;

    if (w)
      return v;

  }`;
  const ast = runSemanticAnalysis(parse(lex(main)));
  expect(ast).toHavePrettyPrint(`
Program (
  Function main() {
    Declaration (v.0,-(2));
    Declaration (w.1,-(1));
    Declaration (x.2,0);
    Declaration (y.3,1);
    Declaration (z.4,2);
    If(plus(w.1, 1)) {
      return Conditional(x.2, y.3, z.4);
    } Else {
      return v.0;
    }
    If(w.1) {
      return v.0;
    }
  }
)
`);
});
