import { Program, Function, Stmt, Expr, Constant } from "./ast";
const INDENT_INCREMENT = 2;

function printLine(line: string, indentLevel: number): string {
  return " ".repeat(indentLevel) + line + "\n";
}

function printConstant(c: Constant): string {
  switch (c.kind) {
    case "numeric-const": {
      return `${c.value}`;
    }
    case "string-const": {
      return `${c.value}`;
    }
    default: {
      const _check: never = c;
      return _check;
    }
  }
}
function printExpr(exp: Expr): string {
  return printConstant(exp);
}
function printStmt(stmt: Stmt, indentLevel: number): string {
  let exp = printExpr(stmt.expr);
  return printLine(`return ${exp};`, indentLevel);
}

function printFunction(func: Function, indentLevel: number): string {
  let b = printStmt(func.body, indentLevel + INDENT_INCREMENT);
  let ret = printLine(`Function ${func.name}() {`, indentLevel);
  ret += b;
  ret += printLine("}", indentLevel);
  return ret;
}

function printProgram(program: Program, indentLevel: number): string {
  let f = printFunction(
    program.function_definition,
    indentLevel + INDENT_INCREMENT
  );
  return `${printLine("Program (", indentLevel)}${f}${printLine(
    ")",
    indentLevel
  )}`;
}

export function prettyPrint(ast: Program): string {
  return printProgram(ast, 0);
}
