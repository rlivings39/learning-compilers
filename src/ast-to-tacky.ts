import * as tacky from "./tacky";
import * as ast from "./ast";
import { NotccError } from "./errors";
import { Identifier } from "./shared";

type ValAndInstructions = {
  val: tacky.Value;
  instrs: tacky.Instruction[];
};
class AstToTacky {
  private VAR_ID = 0;
  private LABEL_ID = 0;
  makeTemp(): tacky.Var {
    return tacky.Var(`tmp.${this.VAR_ID++}`);
  }

  makeLabel(name: Identifier): tacky.Label {
    return tacky.Label(`${name}${this.LABEL_ID++}`);
  }

  convertUnary(unaryExpr: ast.UnaryExpr): ValAndInstructions {
    const tmpVar = this.makeTemp();
    const { val: expr, instrs } = this.convertExpr(unaryExpr.expr);
    const { kind } = unaryExpr;
    let maker;
    switch (kind) {
      case "complement": {
        maker = tacky.Complement;
        break;
      }
      case "unary-minus": {
        maker = tacky.UnaryMinus;
        break;
      }
      case "logical-not": {
        maker = tacky.LogicalNot;
        break;
      }
      default: {
        const _check: never = kind;
        return _check;
      }
    }
    const tackyUnary = maker(expr, tmpVar);
    instrs.push(tackyUnary);
    return { val: tmpVar, instrs };
  }

  convertShortCircuitBinary(
    binOp: ast.BinaryExpr,
    _op: "and" | "or"
  ): ValAndInstructions {
    // TODO
    const { val: lhsVal, instrs: lhsInstrs } = this.convertExpr(binOp.lhs);
    const { val: rhsVal, instrs: rhsInstrs } = this.convertExpr(binOp.lhs);
    const isAnd = _op === "and";
    const targetName = isAnd ? "false_label" : "true_label";
    const shortCircuitLabel = this.makeLabel(targetName);
    const endLabel = this.makeLabel("end");
    const jumpFactory = isAnd ? tacky.JumpIfZero : tacky.JumpIfNotZero;
    const firstJump = jumpFactory(lhsVal, shortCircuitLabel.name);
    const secondJump = jumpFactory(rhsVal, shortCircuitLabel.name);
    const res = this.makeTemp();
    const copy1 = tacky.Copy(tacky.Constant(isAnd ? 1 : 0), res);
    const copy2 = tacky.Copy(tacky.Constant(isAnd ? 0 : 1), res);
    const instructions: tacky.Instruction[] = [
      ...lhsInstrs,
      firstJump,
      ...rhsInstrs,
      secondJump,
      copy1,
      tacky.Jump(endLabel.name),
      shortCircuitLabel,
      copy2,
      endLabel,
    ];
    return { val: res, instrs: instructions };
  }

  convertBinary(binaryExpr: ast.BinaryExpr): ValAndInstructions {
    if (binaryExpr.operator === "and" || binaryExpr.operator === "or") {
      // Handle short-circuiting operators separately
      return this.convertShortCircuitBinary(binaryExpr, binaryExpr.operator);
    }
    const { val: lhsVal, instrs: lhsInstrs } = this.convertExpr(binaryExpr.lhs);
    const { val: rhsVal, instrs: rhsInstrs } = this.convertExpr(binaryExpr.rhs);
    const instrs = lhsInstrs;
    instrs.push(...rhsInstrs);
    const output = this.makeTemp();
    const binOp = tacky.BinaryOp(binaryExpr.operator, lhsVal, rhsVal, output);
    instrs.push(binOp);
    return { val: output, instrs };
  }

  convertExpr(expr: ast.Expr): ValAndInstructions {
    const kind = expr.kind;
    switch (kind) {
      case "string-const": {
        throw new NotccError("String constants not supported");
      }
      case "numeric-const": {
        return { val: tacky.Constant(expr.value), instrs: [] };
      }
      case "complement":
      case "unary-minus":
      case "logical-not": {
        return this.convertUnary(expr);
      }
      case "binary-expr": {
        return this.convertBinary(expr);
      }
      default: {
        const _check: never = kind;
        return _check;
      }
    }
  }

  convertStatement(stmt: ast.Stmt): tacky.Instruction[] {
    const instructions: tacky.Instruction[] = [];
    switch (stmt.kind) {
      case "return-stmt": {
        const { val, instrs } = this.convertExpr(stmt.expr);
        instructions.push(...instrs);
        instructions.push(tacky.Return(val));
        break;
      }
      default: {
        const _check: never = stmt.kind;
        return _check;
      }
    }
    return instructions;
  }

  convertFunction(func: ast.Function): tacky.Function {
    const instructions: tacky.Instruction[] = this.convertStatement(func.body);
    return tacky.Function(func.name, instructions);
  }

  convertProgram(prog: ast.Program): tacky.Program {
    const func = this.convertFunction(prog.function_definition);
    return tacky.Program(func);
  }
}

/**
 * Converts the parser's AST to our three address code IR, TACKY
 * @param ast
 */
export function astToTacky(ast: ast.Program): tacky.Program {
  const astToTacky = new AstToTacky();
  return astToTacky.convertProgram(ast);
}
