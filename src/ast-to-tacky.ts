import * as tacky from "./tacky";
import * as ast from "./ast";
import { fail } from "assert";

let VAR_ID = 0;
function makeTemp(): tacky.Var {
  return tacky.Var(`tmp${VAR_ID++}`);
}

type ValAndInstructions = {
  val: tacky.Value;
  instrs: tacky.Instruction[];
};
function convertUnary(unaryExpr: ast.UnaryExpr): tacky.UnaryOp {
  // TODO assignments
  const tmpVar = makeTemp();
  const expr = convertExpr(unaryExpr.expr);
  const { kind } = unaryExpr;
  switch (kind) {
    case "complement": {
      return tacky.Complement(expr, tmpVar);
    }
    case "unary-minus": {
      return tacky.UnaryMinus(expr, tmpVar);
    }
    default:
      const _check: never = kind;
      return _check;
  }
}

function convertExpr(expr: ast.Expr): ValAndInstructions {
  const kind = expr.kind;
  // TODO could this need to add more instructions?
  switch (kind) {
    case "string-const": {
      throw new Error("String constants not supported");
    }
    case "numeric-const": {
      return { val: tacky.Constant(expr.value), instrs: [] };
    }
    case "complement":
    case "unary-minus": {
      const unaryInstruction = convertUnary(expr);
      return { val: unaryInstruction.dst, instrs: [unaryInstruction] };
    }
    default: {
      const _check: never = kind;
      return _check;
    }
  }
}

function convertStatement(stmt: ast.Stmt): tacky.Instruction[] {
  let instructions: tacky.Instruction[] = [];
  switch (stmt.kind) {
    case "return-stmt": {
      const { val, instrs } = convertExpr(stmt.expr);
      instructions.concat(instrs);
      instructions.push(tacky.Return(val));
      return instructions;
    }
    default: {
      const _check: never = stmt.kind;
      return _check;
    }
  }
  return instructions;
}

function convertFunction(func: ast.Function): tacky.Function {
  const instructions: tacky.Instruction[] = convertStatement(func.body);
  return tacky.Function(func.name, instructions);
}

function convertProgram(prog: ast.Program): tacky.Program {
  const func = convertFunction(prog.function_definition);
  return tacky.Program(func);
}

/**
 * Converts the parser's AST to our three address code IR, TACKY
 * @param ast
 */
export function astToTacky(ast: ast.Program): tacky.Program {
  return convertProgram(ast);
}
