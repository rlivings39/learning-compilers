import { test, expect, assert } from "vitest";
import { astToTacky } from "./ast-to-tacky";
import { parse } from "./parse";
import { lex } from "./lex";
import * as tacky from "./tacky";
import { prettyPrintTacky } from "./pretty-print-tacky";

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
  expect(prettyPrintTacky(tacky2)).toEqual(`Function main () {
  Uminus($4, %tmp.3)
  Uminus(%tmp.3, %tmp.2)
  BitComp(%tmp.2, %tmp.1)
  Uminus(%tmp.1, %tmp.0)
  Return(%tmp.0)
}`);
});

test("Logical operators to TACKY", () => {
  const main = `int main(void) {
    return !(3 < 4 <= 5 > 6 >= 7 == 8 != 9);
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(prettyPrintTacky(tacky)).toEqual(`Function main () {
  less($3,$4,%tmp.1)
  less-eq(%tmp.1,$5,%tmp.2)
  greater(%tmp.2,$6,%tmp.3)
  greater-eq(%tmp.3,$7,%tmp.4)
  equal(%tmp.4,$8,%tmp.5)
  not-equal(%tmp.5,$9,%tmp.6)
  Not(%tmp.6, %tmp.0)
  Return(%tmp.0)
}`);
});

test("Short-circuiting operators to TACKY", () => {
  const main = `int main(void) {
    return (1*2) && (2-3);
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(prettyPrintTacky(tacky)).toEqual(`Function main () {
  multiply($1,$2,%tmp.0)
  JumpIfZero(%tmp.0, false_label)
  subtract($2,$3,%tmp.1)
  JumpIfZero(%tmp.1, false_label)
  Copy($1, %tmp.2)
  Jump(end)
  Label(false_label)
  Copy($0, %tmp.2)
  Label(end)
  Return(%tmp.2)
}`);

  const main2 = `int main(void) {
    return 1 < 2 || 2 >= 3;
  }`;
  const tacky2 = astToTacky(parse(lex(main2)));
  expect(tacky2).not.toBeNull();
  expect(prettyPrintTacky(tacky2)).toEqual(`Function main () {
  less($1,$2,%tmp.0)
  JumpIfNotZero(%tmp.0, true_label)
  greater-eq($2,$3,%tmp.1)
  JumpIfNotZero(%tmp.1, true_label)
  Copy($0, %tmp.2)
  Jump(end)
  Label(true_label)
  Copy($1, %tmp.2)
  Label(end)
  Return(%tmp.2)
}`);
});

test("Label mangling", () => {
  // Ensure we mangle label names to make them unique
  const main = `int main(void) {
    return 1 && 2 && 3;
  }`;
  const tacky = astToTacky(parse(lex(main)));
  expect(tacky).not.toBeNull();
  expect(prettyPrintTacky(tacky)).toEqual(`Function main () {
  JumpIfZero($1, false_label)
  JumpIfZero($2, false_label)
  Copy($1, %tmp.0)
  Jump(end)
  Label(false_label)
  Copy($0, %tmp.0)
  Label(end)
  JumpIfZero(%tmp.0, false_label1)
  JumpIfZero($3, false_label1)
  Copy($1, %tmp.1)
  Jump(end1)
  Label(false_label1)
  Copy($0, %tmp.1)
  Label(end1)
  Return(%tmp.1)
}`);
});
