import * as ast from "./ast";
import { NotccError } from "./errors";
import { Identifier } from "./shared";

type VarTable = Map<Identifier, Identifier>;

function isLvalue(expr: ast.Expr) {
  switch (expr.kind) {
    case "numeric-const":
    case "string-const":
    case "complement":
    case "unary-minus":
    case "logical-not":
    case "binary-expr":
    case "assignment":
      return false;
    case "var":
      return true;
  }
}
function fail(message: string): never {
  throw new NotccError(message);
}

class VariableResolution {
  private varTable: VarTable = new Map();
  private varIndex = 0;

  resolveVarName(name: Identifier): Identifier {
    const newName = this.varTable.get(name);
    if (newName === undefined) {
      fail(`Could not find variable ${name}`);
    }
    return newName;
  }

  recordVarName(name: Identifier): Identifier {
    let newName = this.varTable.get(name);
    if (newName !== undefined) {
      fail(`Variable ${name} already defined`);
    }
    newName = `${name}.${this.varIndex++}`;
    this.varTable.set(name, newName);
    return newName;
  }

  VariableResolutionInBinaryExpr(expr: ast.BinaryExpr | ast.Assignment) {
    this.variableResolutionInExpr(expr.lhs);
    this.variableResolutionInExpr(expr.rhs);
  }
  variableResolutionInExpr(expr: ast.Expr) {
    switch (expr.kind) {
      case "numeric-const":
      case "string-const": {
        return;
      }
      case "complement":
      case "unary-minus":
      case "logical-not": {
        this.variableResolutionInExpr(expr.expr);
        return;
      }
      case "assignment": {
        if (!isLvalue(expr.lhs)) {
          fail(
            `Non-lvalue on left-hand-side of assignment of kind ${expr.lhs.kind}`
          );
        }
        this.VariableResolutionInBinaryExpr(expr);
        return;
      }
      case "binary-expr": {
        this.VariableResolutionInBinaryExpr(expr);
        return;
      }
      case "var": {
        const newName = this.resolveVarName(expr.name);
        expr.name = newName;
        return;
      }
    }
  }

  variableResolution(prog: ast.Program) {
    for (const block of prog.function_definition.body) {
      switch (block.kind) {
        case "expr-stmt":
        case "return-stmt": {
          this.variableResolutionInExpr(block.expr);
          continue;
        }
        case "null-stmt": {
          continue;
        }
        case "declaration": {
          const newName = this.recordVarName(block.name);
          block.name = newName;
          if (block.init) {
            this.variableResolutionInExpr(block.init);
          }
        }
      }
    }
  }
}

/**
 * Run semantic analysis and error checking on the AST
 *
 * This pass checks for valid variable declarations and makes
 * variable names globally unique.
 * @param prog
 */
export function runSemanticAnalysis(prog: ast.Program) {
  const varResolve = new VariableResolution();
  varResolve.variableResolution(prog);
}
