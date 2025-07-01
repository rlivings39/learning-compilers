import { test, expect } from "vitest";
import { astToTacky } from "./ast-to-tacky";
import { parse } from "./parse";
import { lex } from "./lex";
import * as tacky from "./tacky";

test("AST to TACKY", () => {
  const main1 = `int main(void) {
    return 4;
  }`;
  const ast1 = parse(lex(main1));
  const tacky1 = astToTacky(ast1);
  expect(tacky1.func.name).toBe("main");
  expect(tacky1.func.body).toHaveLength(1);
  const ret1 = tacky1.func.body[0];
  expect(ret1.kind).toBe("return");
  expect(ret1.src.kind).toBe("numeric-constant");
  const returnVal = ret1.src as tacky.Constant;
  expect(returnVal.val).toEqual(4);

  expect(ret1.src);
  const main2 = `int main(void) {
    return -(~(-(-(4))));
  }`;
  const ast2 = parse(lex(main2));
  const tacky2 = astToTacky(ast2);
  // TODO
});
