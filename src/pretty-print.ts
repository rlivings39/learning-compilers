import {
  Program,
  Function,
  Stmt,
  Expr,
  Constant,
  UnaryExpr,
  BinaryExpr,
} from "./ast";
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

function printBinary(binOp: BinaryExpr): string {
  return `${binOp.operator}(${printExpr(binOp.lhs)}, ${printExpr(binOp.rhs)})`;
}

function printUnary(u: UnaryExpr): string {
  // TODO only emit parens when needed
  return `${u.op}(${printExpr(u.expr)})`;
}

function printExpr(exp: Expr): string {
  switch (exp.kind) {
    case "numeric-const":
    case "string-const": {
      return printConstant(exp);
    }
    case "complement":
    case "unary-minus": {
      return printUnary(exp);
    }
    case "binary-expr": {
      return printBinary(exp);
    }
    default: {
      const _checker: never = exp;
      return _checker;
    }
  }
}
function printStmt(stmt: Stmt, indentLevel: number): string {
  const exp = printExpr(stmt.expr);
  return printLine(`return ${exp};`, indentLevel);
}

function printFunction(func: Function, indentLevel: number): string {
  const b = printStmt(func.body, indentLevel + INDENT_INCREMENT);
  let ret = printLine(`Function ${func.name}() {`, indentLevel);
  ret += b;
  ret += printLine("}", indentLevel);
  return ret;
}

function printProgram(program: Program, indentLevel: number): string {
  const f = printFunction(
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
