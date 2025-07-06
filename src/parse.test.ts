import { test, expect } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import { prettyPrint } from "./pretty-print";

test("Parsing", () => {
  const mainProg = `
  int main (void) {
    return 2;
  }`;

  const tokens = lex(mainProg);
  const prog = parse(tokens);
  expect(prettyPrint(prog).trim()).toEqual(`Program (
  Function main() {
    return 2;
  }
)`);
  const mainProgJunk = mainProg + "}";
  const tokens2 = lex(mainProgJunk);
  expect(() => parse(tokens2)).toThrow();

  const mainProgUminus = `
  int main (void) {
    return -2;
  }`;
  const tokensUminus = lex(mainProgUminus);
  const ast = parse(tokensUminus);
  expect(ast.function_definition.body.expr.kind).toEqual("unary-minus");
  expect(prettyPrint(ast).trim()).toEqual(`Program (
  Function main() {
    return -(2);
  }
)`);

  const mainProgDecrement = `
  int main (void) {
    return --2;
  }`;
  expect(() => parse(lex(mainProgDecrement))).toThrow(/not supported/);

  const mainProgDoubleMinus = `
  int main (void) {
    return -(-2);
  }`;
  const astDoubleMinus = parse(lex(mainProgDoubleMinus));
  expect(prettyPrint(astDoubleMinus).trim()).toEqual(`Program (
  Function main() {
    return -(-(2));
  }
)`);
});

test("Binary operator parsing", () => {
  const plusProg = `int main(void) { return 1 - 4;}`;
  const plusAst = parse(lex(plusProg));
  expect(plusAst.function_definition.name).toBe("main");
  expect(prettyPrint(plusAst).trim()).toEqual(`Program (
  Function main() {
    return subtract(1, 4);
  }
)`);

  const plusMinusProg = `int main(void) { return 1 - 4 + 3;}`;
  const plusMinusAst = parse(lex(plusMinusProg));
  expect(prettyPrint(plusMinusAst).trim()).toEqual(`Program (
  Function main() {
    return plus(subtract(1, 4), 3);
  }
)`);

  const manyOpsProg = `int main(void) { return 1 - 3 * 4;}`;
  const manyOpsAst = parse(lex(manyOpsProg));
  expect(prettyPrint(manyOpsAst).trim()).toEqual(`Program (
  Function main() {
    return subtract(1, multiply(3, 4));
  }
)`);
});
