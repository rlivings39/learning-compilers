import * as asm from "./asm";
const INDENT = " ".repeat(2);

function emitOperand(op: asm.Operand): string {
  let res = "";
  switch (op.kind) {
    case "number": {
      res += `$${op.value}`;
      break;
    }
    case "register": {
      res += `%eax`;
      break;
    }
    default: {
      const _check: never = op;
      return _check;
    }
  }
  return res;
}

function emitReturn(ret: asm.Return): string {
  return "ret";
}

function emitMove(mv: asm.Move): string {
  let res = `movl ${emitOperand(mv.src)}, ${emitOperand(mv.dst)}`;

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
  let res = `${INDENT}.globl ${func.name}
${func.name}:
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
