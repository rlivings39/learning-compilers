import { test, expect } from "vitest";
import { astToTacky } from "./ast-to-tacky";
import { parse } from "./parse";
import { lex } from "./lex";
import { prettyPrintTacky } from "./pretty-print-tacky";
test("Pretty print TACKY", () => {
  const main1 = "int main(void) { return -(~(-(-(4)))); }";
  const tacky1 = astToTacky(parse(lex(main1)));
  const expected1 = `Function main () {
  Uminus($4, %notcc.tmp.3)
  Uminus(%notcc.tmp.3, %notcc.tmp.2)
  BitComp(%notcc.tmp.2, %notcc.tmp.1)
  Uminus(%notcc.tmp.1, %notcc.tmp.0)
  Return(%notcc.tmp.0)
}`;
  expect(prettyPrintTacky(tacky1)).toEqual(expected1);
});

test("Pretty print TACKY binary ops", () => {
  const main1 = "int main(void) { return 1 % 5 + 2 * 3 / 4; }";
  const tacky1 = astToTacky(parse(lex(main1)));
  const expected1 = `Function main () {
  remainder($1,$5,%notcc.tmp.0)
  multiply($2,$3,%notcc.tmp.1)
  divide(%notcc.tmp.1,$4,%notcc.tmp.2)
  plus(%notcc.tmp.0,%notcc.tmp.2,%notcc.tmp.3)
  Return(%notcc.tmp.3)
}`;
  expect(prettyPrintTacky(tacky1)).toEqual(expected1);
});
