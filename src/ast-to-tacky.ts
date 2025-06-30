import * as tacky from "./tacky";
import * as ast from "./ast";

function convertStatement(stmt: ast.Stmt): tacky.Instruction[] {
  let instructions: tacky.Instruction[] = [];

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
