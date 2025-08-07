import {
  Program,
  Function,
  Stmt,
  Expr,
  Constant,
  UnaryExpr,
  BinaryExpr,
  BlockItem,
  Declaration,
  Assignment,
  Var,
  IfStmt,
  Conditional,
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
  return `${u.op}(${printExpr(u.expr)})`;
}

function printAssignment(assign: Assignment): string {
  // TODO parens?
  return `=(${printExpr(assign.lhs)}, ${printExpr(assign.rhs)})`;
}

function printVar(v: Var): string {
  return v.name;
}

function printConditional(exp: Conditional): string {
  return `Conditional(${printExpr(exp.cond)}, ${printExpr(
    exp.trueExpr
  )}, ${printExpr(exp.falseExpr)})`;
}

function printExpr(exp: Expr): string {
  switch (exp.kind) {
    case "numeric-const":
    case "string-const": {
      return printConstant(exp);
    }
    case "complement":
    case "unary-minus":
    case "logical-not": {
      return printUnary(exp);
    }
    case "binary-expr": {
      return printBinary(exp);
    }
    case "assignment": {
      return printAssignment(exp);
    }
    case "var": {
      return printVar(exp);
    }
    case "conditional": {
      return printConditional(exp);
    }
    default: {
      const _checker: never = exp;
      return _checker;
    }
  }
}

function printIfStmt(stmt: IfStmt, indentLevel: number): string {
  let res = printLine(`If(${printExpr(stmt.cond)}) {`, indentLevel);
  const childIndent = indentLevel + INDENT_INCREMENT;
  res += printStmt(stmt.thenStmt, childIndent);
  if (stmt.elseStmt) {
    res += printLine("} Else {", indentLevel);
    res += printStmt(stmt.elseStmt, childIndent);
    res += printLine("}", indentLevel);
  } else {
    res += printLine("}", indentLevel);
  }
  return res;
}

function printStmt(stmt: Stmt, indentLevel: number): string {
  switch (stmt.kind) {
    case "return-stmt": {
      const exp = printExpr(stmt.expr);
      return printLine(`return ${exp};`, indentLevel);
    }
    case "expr-stmt": {
      const exp = printExpr(stmt.expr);
      return printLine(`${exp};`, indentLevel);
    }

    case "null-stmt": {
      return printLine(`;`, indentLevel);
    }

    case "if-stmt": {
      return printIfStmt(stmt, indentLevel);
    }
  }
}

function printDeclaration(decl: Declaration, indentLevel: number): string {
  const init = decl?.init ? `,${printExpr(decl.init)}` : "";
  return printLine(`Declaration (${decl.name}${init});`, indentLevel);
}

function printBlock(block: BlockItem, indentLevel: number): string {
  switch (block.kind) {
    case "declaration":
      return printDeclaration(block, indentLevel);
    case "return-stmt":
    case "expr-stmt":
    case "null-stmt":
    case "if-stmt":
      return printStmt(block, indentLevel);
  }
}

function printFunction(func: Function, indentLevel: number): string {
  const body = func.body
    .map((block) => printBlock(block, indentLevel + INDENT_INCREMENT))
    .join("");
  let ret = printLine(`Function ${func.name}() {`, indentLevel);
  ret += body;
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
