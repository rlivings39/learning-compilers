import { test, expect } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import * as ast from "./ast";
import { NotccError } from "./errors";
import "./test-tools";

test("Parsing", () => {
  const mainProg = `
  int main (void) {
    return 2;
  }`;
  expect(mainProg).toHavePrettyPrint(`
Program (
  Function main() {
    return 2;
  }
)`);

  const mainProgJunk = mainProg + "}";
  expect(() => parse(lex(mainProgJunk))).toThrow();

  const mainProgUminus = `
  int main (void) {
    return -2;
  }`;
  const tokensUminus = lex(mainProgUminus);
  const ast = parse(tokensUminus);
  expect((ast.function_definition.body[0] as ast.ReturnStmt).expr.kind).toEqual(
    "unary-minus"
  );
  expect(ast).toHavePrettyPrint(`
Program (
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
  expect(mainProgDoubleMinus).toHavePrettyPrint(`
Program (
  Function main() {
    return -(-(2));
  }
)`);
});

test("Binary operator parsing", () => {
  const plusProg = `int main(void) { return 1 - 4;}`;
  const plusAst = parse(lex(plusProg));
  expect(plusAst.function_definition.name).toBe("main");
  expect(plusAst).toHavePrettyPrint(`Program (
  Function main() {
    return subtract(1, 4);
  }
)`);

  const plusMinusProg = `int main(void) { return 1 - 4 + 3;}`;
  expect(plusMinusProg).toHavePrettyPrint(`Program (
  Function main() {
    return plus(subtract(1, 4), 3);
  }
)`);

  const manyOpsProg = `int main(void) { return 1 - 3 * 4;}`;
  expect(manyOpsProg).toHavePrettyPrint(`Program (
  Function main() {
    return subtract(1, multiply(3, 4));
  }
)`);

  const allOpsProg = `int main(void) { return 1 - 3 * 4 + 5 % 6;}`;
  expect(allOpsProg).toHavePrettyPrint(`Program (
  Function main() {
    return plus(subtract(1, multiply(3, 4)), remainder(5, 6));
  }
)`);

  const parenOpsProg = `int main(void) { return (1 - 3) * 4 + 5 % 6;}`;
  expect(parenOpsProg).toHavePrettyPrint(`Program (
  Function main() {
    return plus(multiply(subtract(1, 3), 4), remainder(5, 6));
  }
)`);
});

test("Logical ops", () => {
  const logicalOpsProg = `int main(void) { return 1 && 2 || 3 < 4 <= 5 > 6 >= 7 == 8 != 9;}`;
  expect(logicalOpsProg).toHavePrettyPrint(`Program (
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
  expect(ast1).toHavePrettyPrint(
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

test("Parse if", () => {
  const main1 = `
  int main(void) {
    if (0)
      return 0;
  }
  `.trim();
  expect(main1).toHavePrettyPrint(
    `Program (
  Function main() {
    If(0) {
      return 0;
    }
  }
)`
  );
});

test("Parse if/else", () => {
  const main1 = `
  int main(void) {
    if (0)
      return 0;
    else
      return 1;
  }
  `.trim();
  expect(main1).toHavePrettyPrint(
    `Program (
  Function main() {
    If(0) {
      return 0;
    } Else {
      return 1;
    }
  }
)`
  );
});

test("Parse if/else if", () => {
  const main1 = `
  int main(void) {
    if (0)
      return 0;
    else if(2)
      return 1;
  }
  `.trim();
  expect(main1).toHavePrettyPrint(
    `Program (
  Function main() {
    If(0) {
      return 0;
    } Else {
      If(2) {
        return 1;
      }
    }
  }
)`
  );
});

test("Parse if/else if/else", () => {
  const main1 = `
  int main(void) {
    if (0)
      return 0;
    else if(2)
      return 1;
    else
      return 2;
  }
  `.trim();
  expect(main1).toHavePrettyPrint(
    `Program (
  Function main() {
    If(0) {
      return 0;
    } Else {
      If(2) {
        return 1;
      } Else {
        return 2;
      }
    }
  }
)`
  );
});

test("Parse conditional expr", () => {
  const main1 = `int main(void) {
    int a = 7;
    int x;
    x = 0 ? 1 + 2 : 3*a;
    return x;
  }`;
  expect(main1).toHavePrettyPrint(`
Program (
  Function main() {
    Declaration (a,7);
    Declaration (x);
    =(x, Conditional(0, plus(1, 2), multiply(3, a)));
    return x;
  }
)`);

  expect(() => parse(lex("int main(void) { 0 ? ; "))).toThrow(NotccError);
  expect(() => parse(lex("int main(void) { 0 ? 1: ; "))).toThrow(NotccError);
});
