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

  VariableResolutionInBinaryExpr(
    expr: ast.BinaryExpr | ast.Assignment
  ): typeof expr {
    const lhs = this.variableResolutionInExpr(expr.lhs);
    const rhs = this.variableResolutionInExpr(expr.rhs);
    const res = { ...expr, lhs, rhs };
    return res;
  }

  variableResolutionInExpr(expr: ast.Expr): ast.Expr {
    switch (expr.kind) {
      case "numeric-const":
      case "string-const": {
        return expr;
      }
      case "complement":
      case "unary-minus":
      case "logical-not": {
        return { ...expr, expr: this.variableResolutionInExpr(expr.expr) };
      }
      case "assignment": {
        if (!isLvalue(expr.lhs)) {
          fail(
            `Non-lvalue on left-hand-side of assignment of kind ${expr.lhs.kind}`
          );
        }
        return this.VariableResolutionInBinaryExpr(expr);
      }
      case "binary-expr": {
        return this.VariableResolutionInBinaryExpr(expr);
      }
      case "var": {
        const newName = this.resolveVarName(expr.name);
        return ast.Var(newName);
      }
    }
  }

  variableResolution(prog: ast.Program) {
    prog.function_definition.body = prog.function_definition.body.map(
      (block) => {
        switch (block.kind) {
          case "expr-stmt":
          case "return-stmt": {
            return {
              ...block,
              expr: this.variableResolutionInExpr(block.expr),
            };
          }
          case "null-stmt": {
            return block;
          }
          case "declaration": {
            const newName = this.recordVarName(block.name);
            let newInit = null;
            if (block.init) {
              newInit = this.variableResolutionInExpr(block.init);
            }
            return ast.Declaration(newName, newInit);
          }
        }
      }
    );
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
