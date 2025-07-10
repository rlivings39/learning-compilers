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
    .with({ kind: "logical-not" }, () => "Not")
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

function prettyPrintBinary(binOp: tacky.BinaryOp, indent: number): string {
  const res = printLine(
    `${binOp.operator}(${prettyPrintValue(binOp.lhs, 0)},${prettyPrintValue(
      binOp.rhs,
      0
    )},${prettyPrintValue(binOp.dst, 0)})`,
    indent
  );
  return res;
}

function prettyPrintLabel(label: tacky.Label, indent: number): string {
  return printLine(`Label(${label.name})`, indent);
}

function printCopy(copy: tacky.Copy, indent: number): string {
  return printLine(
    `Copy(${prettyPrintValue(copy.src, 0)}, ${prettyPrintValue(copy.dst, 0)})`,
    indent
  );
}

function printJump(jump: tacky.Jump, indent: number): string {
  return printLine(`Jump(${jump.target})`, indent);
}

function prettyPrintJumpNotZero(
  jnz: tacky.JumpIfNotZero,
  indent: number
): string {
  return printLine(
    `JumpIfNotZero(${prettyPrintValue(jnz.condition, 0)}, ${jnz.target})`,
    indent
  );
}

function prettyPrintJumpIfZero(jnz: tacky.JumpIfZero, indent: number): string {
  return printLine(
    `JumpIfZero(${prettyPrintValue(jnz.condition, 0)}, ${jnz.target})`,
    indent
  );
}

function prettyPrintInstruction(
  instr: tacky.Instruction,
  indent: number
): string {
  const res = match(instr)
    .with(
      { kind: "complement" },
      { kind: "unary-minus" },
      { kind: "logical-not" },
      (unary) => prettyPrintUnary(unary, indent)
    )
    .with({ kind: "return" }, (ret) => prettyPrintReturn(ret, indent))
    .with({ kind: "binary-expr" }, (binOp) => prettyPrintBinary(binOp, indent))
    .with({ kind: "label" }, (label) => prettyPrintLabel(label, indent))
    .with({ kind: "copy" }, (copy) => printCopy(copy, indent))
    .with({ kind: "jump" }, (jump) => printJump(jump, indent))
    .with({ kind: "jump-if-not-zero" }, (jnz) =>
      prettyPrintJumpNotZero(jnz, indent)
    )
    .with({ kind: "jump-if-zero" }, (j) => prettyPrintJumpIfZero(j, indent))
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
