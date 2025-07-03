import * as asm from "./asm";
import { NotccError } from "./errors";
const INDENT = " ".repeat(2);

function emitOperand(op: asm.Operand): string {
  let res = "";
  switch (op.kind) {
    case "number": {
      res += `$${op.value}`;
      break;
    }
    case "register": {
      res += op.reg === "AX" ? "%eax" : "%r10d";
      break;
    }
    case "pseudo": {
      throw new NotccError("pseudo registers must not exist in the backend");
    }
    case "stack": {
      res += `${op.offset}(%rbp)`;
      break;
    }
    default: {
      const _check: never = op;
      return _check;
    }
  }
  return res;
}

function emitReturn(_ret: asm.Return): string {
  const asm = `movq %rbp, %rsp
${INDENT}popq %rbp
${INDENT}ret
`;
  return asm;
}

function emitMove(mv: asm.Move): string {
  const res = `movl ${emitOperand(mv.src)}, ${emitOperand(mv.dst)}`;

  return res;
}

function emitAllocStack(s: asm.AllocateStack): string {
  return `subq $${s.bytes}, %rsp`;
}

function emitUnary(unary: asm.UnaryOp): string {
  let instr: string;
  switch (unary.kind) {
    case "neg": {
      instr = "negl";
      break;
    }
    case "not": {
      instr = "notl";
      break;
    }
    default: {
      const _check: never = unary;
      return _check;
    }
  }
  const res = `${instr} ${emitOperand(unary.inout)}`;
  return res;
}

function emitInstructions(instructions: asm.Instruction[]): string {
  let res = "";
  instructions.forEach((instr) => {
    res += INDENT;
    switch (instr.kind) {
      case "move": {
        res += emitMove(instr);
        break;
      }
      case "return": {
        res += emitReturn(instr);
        break;
      }
      case "neg":
      case "not": {
        res += emitUnary(instr);
        break;
      }
      case "allocate-stack": {
        res += emitAllocStack(instr);
        break;
      }
      default: {
        const _check: never = instr;
        return _check;
      }
    }
    res += "\n";
  });
  return res;
}

function emitFunction(func: asm.Function): string {
  const res = `${INDENT}.globl ${func.name}
${func.name}:
${INDENT}pushq %rbp
${INDENT}movq  %rsp, %rbp
${emitInstructions(func.instructions)}`;
  return res;
}

function emitProgram(prog: asm.Program): string {
  const res = emitFunction(prog.function_definition);
  return res;
}

export function emitAsm(prog: asm.Program): string {
  let res = emitProgram(prog);

  res += INDENT + '.section .note.GNU-stack,"",@progbits\n';
  return res;
}
