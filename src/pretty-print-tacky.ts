import * as tacky from "./tacky";
import { match } from "ts-pattern";

const INDENT_OFFSET = 2;

function indentString(str: string, indent: number): string {
  return " ".repeat(indent) + str;
}

function printLine(line: string, indent: number): string {
  return indentString(line, indent) + "\n";
}

function prettyPrintVar(v: tacky.Var, _indent: number): string {
  return `%${v.name}`;
}

function prettyPrintNumericConstant(
  c: tacky.Constant,
  _indent: number
): string {
  return `$${c.val}`;
}

function prettyPrintValue(val: tacky.Value, _indent: number): string {
  const res = match(val)
    .with({ kind: "numeric-constant" }, (c) => prettyPrintNumericConstant(c, 0))
    .with({ kind: "var" }, (v) => prettyPrintVar(v, 0))
    .exhaustive();

  return res;
}

function prettyPrintReturn(ret: tacky.Return, indent: number): string {
  return printLine(`Return(${prettyPrintValue(ret.src, 0)})`, indent);
}

function prettyPrintUnary(unary: tacky.UnaryOp, indent: number): string {
  const opstr: string = match(unary)
    .with({ kind: "complement" }, () => "BitComp")
    .with({ kind: "unary-minus" }, () => "Uminus")
    .exhaustive();

  const res = printLine(
    `${opstr}(${prettyPrintValue(unary.src, 0)}, ${prettyPrintValue(
      unary.dst,
      0
    )})`,
    indent
  );
  return res;
}

function prettyPrintInstruction(
  instr: tacky.Instruction,
  indent: number
): string {
  const res = match(instr)
    .with({ kind: "complement" }, { kind: "unary-minus" }, (unary) =>
      prettyPrintUnary(unary, indent)
    )
    .with({ kind: "return" }, (ret) => prettyPrintReturn(ret, indent))
    .exhaustive();

  return res;
}

function prettyPrintFunction(func: tacky.Function, indent: number): string {
  let res = printLine(`Function ${func.name} () {`, indent);
  const bodyIndent = indent + INDENT_OFFSET;
  func.body.forEach((instr) => {
    res += prettyPrintInstruction(instr, bodyIndent);
  });
  res += indentString("}", indent);
  return res;
}

export function prettyPrintTacky(prog: tacky.Program): string {
  const indent = 0;
  const res = prettyPrintFunction(prog.func, indent);
  return res;
}
