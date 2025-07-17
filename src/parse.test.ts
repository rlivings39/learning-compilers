import { test, expect } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import { prettyPrint } from "./pretty-print";
import * as ast from "./ast";

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
  expect((ast.function_definition.body[0] as ast.ReturnStmt).expr.kind).toEqual(
    "unary-minus"
  );
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

  const allOpsProg = `int main(void) { return 1 - 3 * 4 + 5 % 6;}`;
  const allOpsAst = parse(lex(allOpsProg));
  expect(prettyPrint(allOpsAst).trim()).toEqual(`Program (
  Function main() {
    return plus(subtract(1, multiply(3, 4)), remainder(5, 6));
  }
)`);

  const parenOpsProg = `int main(void) { return (1 - 3) * 4 + 5 % 6;}`;
  const parenOpsAst = parse(lex(parenOpsProg));
  expect(prettyPrint(parenOpsAst).trim()).toEqual(`Program (
  Function main() {
    return plus(multiply(subtract(1, 3), 4), remainder(5, 6));
  }
)`);
});

test("Logical ops", () => {
  const logicalOpsProg = `int main(void) { return 1 && 2 || 3 < 4 <= 5 > 6 >= 7 == 8 != 9;}`;
  const logicalOpsAst = parse(lex(logicalOpsProg));
  expect(prettyPrint(logicalOpsAst).trim()).toEqual(`Program (
  Function main() {
    return or(and(1, 2), not-equal(equal(greater-eq(greater(less-eq(less(3, 4), 5), 6), 7), 8), 9));
  }
)`);
});

test("Function body and assignment", () => {
  const main1 = `
  int main(void) {
  ;
    int x = 1;
    int y;
    int z;
    y = 2;
    z = y + (x=y=3);
    return y + x + z;
  }`;
  const ast1 = parse(lex(main1));
  expect(ast1.function_definition.body).toHaveLength(7);
  expect(prettyPrint(ast1).trim()).toEqual(
    `
Program (
  Function main() {
    ;
    Declaration (x,1);
    Declaration (y);
    Declaration (z);
    =(y, 2);
    =(z, plus(y, =(x, =(y, 3))));
    return plus(plus(y, x), z);
  }
)`.trim()
  );
});
