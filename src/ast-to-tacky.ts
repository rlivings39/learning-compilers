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
  private LABEL_SET = new Set<Identifier>();
  makeTemp(): tacky.Var {
    return tacky.Var(`notcc.tmp.${this.VAR_ID++}`);
  }

  makeLabel(name: Identifier): tacky.Label {
    let counter = 0;
    let labelName = name;
    while (this.LABEL_SET.has(labelName)) {
      ++counter;
      labelName = name + counter;
    }
    this.LABEL_SET.add(labelName);
    return tacky.Label(labelName);
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
    const { val: lhsVal, instrs: lhsInstrs } = this.convertExpr(binOp.lhs);
    const { val: rhsVal, instrs: rhsInstrs } = this.convertExpr(binOp.rhs);
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

  convertVar(v: ast.Var): ValAndInstructions {
    return { val: tacky.Var(v.name), instrs: [] };
  }

  convertAssignment(assign: ast.Assignment): ValAndInstructions {
    const { val: lhs, instrs: lhsInstrs } = this.convertExpr(assign.lhs);
    const { val: rhs, instrs: rhsInstrs } = this.convertExpr(assign.rhs);
    const instructions = [
      ...lhsInstrs,
      ...rhsInstrs,
      tacky.Copy(rhs, lhs as tacky.Assignable), // TODO get rid of case
    ];
    return { val: lhs, instrs: instructions };
  }

  convertConditional(expr: ast.Conditional): ValAndInstructions {
    const val = this.makeTemp();
    const endLabel = this.makeLabel("cond_end_label");
    const falseLabel = this.makeLabel("cond_false_label");
    const { val: cond, instrs: condInstrs } = this.convertExpr(expr.cond);
    const jumpFalse = tacky.JumpIfZero(cond, falseLabel.name);
    const jumpEnd = tacky.Jump(endLabel.name);
    const { val: trueVal, instrs: trueInstrs } = this.convertExpr(
      expr.trueExpr
    );
    const { val: falseVal, instrs: falseInstrs } = this.convertExpr(
      expr.falseExpr
    );
    const instructions = [
      ...condInstrs,
      jumpFalse,
      ...trueInstrs,
      tacky.Copy(trueVal, val),
      jumpEnd,
      falseLabel,
      ...falseInstrs,
      tacky.Copy(falseVal, val),
      endLabel,
    ];
    return { val, instrs: instructions };
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
      case "var": {
        return this.convertVar(expr);
      }
      case "assignment": {
        return this.convertAssignment(expr);
      }
      case "conditional": {
        return this.convertConditional(expr);
      }
      default: {
        const _check: never = kind;
        return _check;
      }
    }
  }

  convertStatement(stmt: ast.BlockItem): tacky.Instruction[] {
    const instructions: tacky.Instruction[] = [];
    switch (stmt.kind) {
      case "expr-stmt": {
        const { instrs } = this.convertExpr(stmt.expr);
        instructions.push(...instrs);
        break;
      }
      case "return-stmt": {
        const { val, instrs } = this.convertExpr(stmt.expr);
        instructions.push(...instrs);
        instructions.push(tacky.Return(val));
        break;
      }
      case "null-stmt": {
        // Nothing to do in tacky
        break;
      }
      case "declaration": {
        if (stmt.init === null) {
          break;
        }
        const v = tacky.Var(stmt.name);
        const { val: init, instrs } = this.convertExpr(stmt.init);
        instructions.push(...instrs, tacky.Copy(init, v));
        break;
      }
      case "if-stmt": {
        const { val: cond, instrs } = this.convertExpr(stmt.cond);
        const trueStmts = this.convertStatement(stmt.thenStmt);
        const endLabel = this.makeLabel("if_end_label");
        if (stmt.elseStmt) {
          const falseStmts = this.convertStatement(stmt.elseStmt);
          const elseLabel = this.makeLabel("else_label");
          const jumpElse = tacky.JumpIfZero(cond, elseLabel.name);
          const jumpEnd = tacky.Jump(endLabel.name);
          instructions.push(
            ...instrs,
            jumpElse,
            ...trueStmts,
            jumpEnd,
            elseLabel,
            ...falseStmts,
            endLabel
          );
        } else {
          const jumpEnd = tacky.JumpIfZero(cond, endLabel.name);
          instructions.push(...instrs, jumpEnd, ...trueStmts, endLabel);
        }

        break;
      }
      default: {
        const _check: never = stmt;
        return _check;
      }
    }
    return instructions;
  }

  convertFunction(func: ast.Function): tacky.Function {
    const instructions: tacky.Instruction[] = func.body
      .map((stmt) => this.convertStatement(stmt))
      .flat(1);

    // Tack (ha) on a return statement to handle cases
    // when main omits it or for void return. If func already
    // had a return statement this will be unreachable. We'll
    // delete it in future optimizations.
    if (
      instructions.length == 0 ||
      instructions[instructions.length - 1].kind !== "return"
    ) {
      instructions.push(tacky.Return(tacky.Constant(0)));
    }
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
