import * as asm from "./asm";
import { NotccError } from "./errors";
import { Identifier } from "./shared";
const INDENT = " ".repeat(2);

type OperandSize = 1 | 4;
const REG_TO_ASM: Record<asm.RegIds, Record<OperandSize, string>> = {
  AX: { "1": "%al", "4": "%eax" },
  DX: { "1": "%dl", "4": "%edx" },
  R10: { "1": "%r10b", "4": "%r10d" },
  R11: { "1": "%r11b", "4": "%r11d" },
};

function emitOperand(op: asm.Operand, sz: OperandSize = 4): string {
  let res = "";
  switch (op.kind) {
    case "number": {
      res += `$${op.value}`;
      break;
    }
    case "register": {
      const regName = REG_TO_ASM[op.reg][sz];
      res += regName;
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

function emitIdiv(idiv: asm.Idiv): string {
  const res = `idiv ${emitOperand(idiv.divisor)}`;
  return res;
}

function emitCdq(_: asm.Cdq): string {
  return "cdq";
}

function emitBinary(binary: asm.Binary): string {
  let instr = "";
  switch (binary.operator) {
    case "add": {
      instr = "addl";
      break;
    }
    case "sub": {
      instr = "subl";
      break;
    }
    case "mul": {
      instr = "imul";
      break;
    }
  }
  const res = `${instr} ${emitOperand(binary.src)}, ${emitOperand(binary.dst)}`;
  return res;
}

function emitCmp(cmp: asm.Cmp): string {
  const res = `cmpl ${emitOperand(cmp.src)}, ${emitOperand(cmp.dst)}`;
  return res;
}

function emitJmp(jmp: asm.Jmp): string {
  const res = `jmp ${mangleLabel(jmp.target)}`;
  return res;
}

function condCodeToSuffix(c: asm.ConditionCode) {
  return c.toLowerCase();
}

function emitJmpcc(jmp: asm.JmpCC): string {
  const res = `j${condCodeToSuffix(jmp.cond)} ${mangleLabel(jmp.target)}`;
  return res;
}

function emitSetcc(setcc: asm.SetCC): string {
  const res = `set${condCodeToSuffix(setcc.cond)} ${emitOperand(setcc.dst, 1)}`;
  return res;
}

function emitLabel(label: Identifier): string {
  return mangleLabel(label) + ":";
}

function mangleLabel(label: Identifier): string {
  //TODO MAC use L instead
  const labelPrefix = ".L";
  return labelPrefix + label;
}

function emitInstructions(instructions: asm.Instruction[]): string {
  let res = "";
  instructions.forEach((instr) => {
    let indentStr = INDENT;
    let thisInstr = "";
    switch (instr.kind) {
      case "move": {
        thisInstr = emitMove(instr);
        break;
      }
      case "return": {
        thisInstr = emitReturn(instr);
        break;
      }
      case "neg":
      case "not": {
        thisInstr = emitUnary(instr);
        break;
      }
      case "allocate-stack": {
        thisInstr = emitAllocStack(instr);
        break;
      }
      case "binary-op": {
        thisInstr = emitBinary(instr);
        break;
      }
      case "idiv": {
        thisInstr = emitIdiv(instr);
        break;
      }
      case "cdq": {
        thisInstr = emitCdq(instr);
        break;
      }
      case "cmp": {
        thisInstr = emitCmp(instr);
        break;
      }
      case "jmp": {
        thisInstr = emitJmp(instr);
        break;
      }
      case "jmpcc": {
        thisInstr = emitJmpcc(instr);
        break;
      }
      case "setcc": {
        thisInstr = emitSetcc(instr);
        break;
      }
      case "label": {
        // No indent for labels
        indentStr = "";
        thisInstr = emitLabel(instr.name);
        break;
      }
      default: {
        const _check: never = instr;
        return _check;
      }
    }
    res += indentStr + thisInstr;
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
