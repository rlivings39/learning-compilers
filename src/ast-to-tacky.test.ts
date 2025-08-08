import { test, expect } from "vitest";
import { astToTacky } from "./ast-to-tacky";
import { parse } from "./parse";
import { lex } from "./lex";
import * as tacky from "./tacky";
import "./test-tools";

test("AST to TACKY", () => {
  const main1 = `int main(void) {
    return 4;
  }`;
  const ast1 = parse(lex(main1));
  const tacky1 = astToTacky(ast1);
  expect(tacky1.func.name).toBe("main");
  expect(tacky1.func.body).toHaveLength(1);
  expect(tacky1.func.body[0].kind).toBe("return");
  const ret1 = tacky1.func.body[0] as tacky.Return;
  expect(ret1.src.kind).toBe("numeric-constant");
  const returnVal = ret1.src as tacky.Constant;
  expect(returnVal.val).toEqual(4);

  expect(ret1.src);
  const main2 = `int main(void) {
    return -(~(-(-(4))));
  }`;
  const ast2 = parse(lex(main2));
  const tacky2 = astToTacky(ast2);

  expect(tacky2).not.toBeNull();
  expect(tacky2).toHaveTackyPrettyPrint(`Function main () {
  Uminus($4, %notcc.tmp.3)
  Uminus(%notcc.tmp.3, %notcc.tmp.2)
  BitComp(%notcc.tmp.2, %notcc.tmp.1)
  Uminus(%notcc.tmp.1, %notcc.tmp.0)
  Return(%notcc.tmp.0)
}`);
});

test("Logical operators to TACKY", () => {
  const main = `int main(void) {
    return !(3 < 4 <= 5 > 6 >= 7 == 8 != 9);
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(tacky).toHaveTackyPrettyPrint(`Function main () {
  less($3,$4,%notcc.tmp.1)
  less-eq(%notcc.tmp.1,$5,%notcc.tmp.2)
  greater(%notcc.tmp.2,$6,%notcc.tmp.3)
  greater-eq(%notcc.tmp.3,$7,%notcc.tmp.4)
  equal(%notcc.tmp.4,$8,%notcc.tmp.5)
  not-equal(%notcc.tmp.5,$9,%notcc.tmp.6)
  Not(%notcc.tmp.6, %notcc.tmp.0)
  Return(%notcc.tmp.0)
}`);
});

test("Short-circuiting operators to TACKY", () => {
  const main = `int main(void) {
    return (1*2) && (2-3);
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(tacky).toHaveTackyPrettyPrint(`Function main () {
  multiply($1,$2,%notcc.tmp.0)
  JumpIfZero(%notcc.tmp.0, false_label)
  subtract($2,$3,%notcc.tmp.1)
  JumpIfZero(%notcc.tmp.1, false_label)
  Copy($1, %notcc.tmp.2)
  Jump(end)
  Label(false_label)
  Copy($0, %notcc.tmp.2)
  Label(end)
  Return(%notcc.tmp.2)
}`);

  const main2 = `int main(void) {
    return 1 < 2 || 2 >= 3;
  }`;
  const tacky2 = astToTacky(parse(lex(main2)));
  expect(tacky2).not.toBeNull();
  expect(tacky2).toHaveTackyPrettyPrint(`Function main () {
  less($1,$2,%notcc.tmp.0)
  JumpIfNotZero(%notcc.tmp.0, true_label)
  greater-eq($2,$3,%notcc.tmp.1)
  JumpIfNotZero(%notcc.tmp.1, true_label)
  Copy($0, %notcc.tmp.2)
  Jump(end)
  Label(true_label)
  Copy($1, %notcc.tmp.2)
  Label(end)
  Return(%notcc.tmp.2)
}`);
});

test("Label mangling", () => {
  // Ensure we mangle label names to make them unique
  const main = `int main(void) {
    return 1 && 2 && 3;
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(tacky).toHaveTackyPrettyPrint(`Function main () {
  JumpIfZero($1, false_label)
  JumpIfZero($2, false_label)
  Copy($1, %notcc.tmp.0)
  Jump(end)
  Label(false_label)
  Copy($0, %notcc.tmp.0)
  Label(end)
  JumpIfZero(%notcc.tmp.0, false_label1)
  JumpIfZero($3, false_label1)
  Copy($1, %notcc.tmp.1)
  Jump(end1)
  Label(false_label1)
  Copy($0, %notcc.tmp.1)
  Label(end1)
  Return(%notcc.tmp.1)
}`);
});

test("Tacky assign", () => {
  const main = `int main(void) {
    int x = 2;
    int y;
    y = 4;
    int z = x * y;
    return z + (y = 3) + 2;
  }`;
  expect(main).toHaveTackyPrettyPrint(
    `
Function main () {
  Copy($2, %x.0)
  Copy($4, %y.1)
  multiply(%x.0,%y.1,%notcc.tmp.0)
  Copy(%notcc.tmp.0, %z.2)
  Copy($3, %y.1)
  plus(%z.2,%y.1,%notcc.tmp.1)
  plus(%notcc.tmp.1,$2,%notcc.tmp.2)
  Return(%notcc.tmp.2)
}`.trim()
  );
});

test("Tacky main no return", () => {
  const main = `int main(void) {
    int x = 0;
  }`;
  expect(main).toHaveTackyPrettyPrint(
    `
Function main () {
  Copy($0, %x.0)
  Return($0)
}`.trim()
  );
});

test("Tacky if/conditional", () => {
  const main = `
  int main(void) {
    int x = 2;
    int y;
    if (x)
      y = x+1 ? 1 : 2;
    else
      y = 3;
    return y;
  }`;
  expect(main).toHaveTackyPrettyPrint(`
Function main () {
  Copy($2, %x.0)
  JumpIfZero(%x.0, else_label)
  plus(%x.0,$1,%notcc.tmp.1)
  JumpIfZero(%notcc.tmp.1, cond_false_label)
  Copy($1, %notcc.tmp.0)
  Jump(cond_end_label)
  Label(cond_false_label)
  Copy($2, %notcc.tmp.0)
  Label(cond_end_label)
  Copy(%notcc.tmp.0, %y.1)
  Jump(if_end_label)
  Label(else_label)
  Copy($3, %y.1)
  Label(if_end_label)
  zReturn(%y.1)
}
`);
});
