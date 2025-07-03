export type NumericConstant = {
  kind: "numeric-const";
  value: number;
};

export function NumericConstant(value: number): NumericConstant {
  return { value, kind: "numeric-const" };
}

export type StringConstant = {
  kind: "string-const";
  value: string;
};

export function StringConstant(value: string): StringConstant {
  return { kind: "string-const", value };
}

export type Constant = NumericConstant | StringConstant;

export type Complement = { kind: "complement"; expr: Expr; op: "~" };
export function Complement(expr: Expr): Complement {
  return { kind: "complement", expr, op: "~" };
}

export type UnaryMinus = { kind: "unary-minus"; expr: Expr; op: "-" };
export function UnaryMinus(expr: Expr): UnaryMinus {
  return { kind: "unary-minus", expr, op: "-" };
}

export type UnaryExpr = Complement | UnaryMinus;
// TODO Or is class better?
// export class UnaryMinus {
//   readonly kind = "unary-minus";
//   readonly op = "-";
//   constructor(public expr: Expr) {}
// }

export type Add = {
  kind: "add";
  lhs: Expr;
  rhs: Expr;
};
export function Add(lhs: Expr, rhs: Expr): Add {
  return { kind: "add", lhs, rhs };
}

export type Subtract = {
  kind: "subtract";
  lhs: Expr;
  rhs: Expr;
};
export function Subtract(lhs: Expr, rhs: Expr): Subtract {
  return { kind: "subtract", lhs, rhs };
}

export type Multiply = {
  kind: "multiply";
  lhs: Expr;
  rhs: Expr;
};
export function Multiply(lhs: Expr, rhs: Expr): Multiply {
  return { kind: "multiply", lhs, rhs };
}

export type Divide = {
  kind: "divide";
  lhs: Expr;
  rhs: Expr;
};
export function Divide(lhs: Expr, rhs: Expr): Divide {
  return { kind: "divide", lhs, rhs };
}

export type Remainder = {
  kind: "remainder";
  lhs: Expr;
  rhs: Expr;
};
export function Remainder(lhs: Expr, rhs: Expr): Remainder {
  return { kind: "remainder", lhs, rhs };
}

export type BinaryExpr = Subtract | Add | Multiply | Divide | Remainder;

export type Expr = Constant | UnaryExpr | BinaryExpr;

export type ReturnStmt = {
  kind: "return-stmt";
  expr: Expr;
};

export function ReturnStmt(expr: Expr): ReturnStmt {
  return { kind: "return-stmt", expr };
}

export type Stmt = ReturnStmt;

export type Identifier = string;

export type Function = {
  name: Identifier;
  body: Stmt;
};

export function Function(name: Identifier, body: Stmt): Function {
  return { name, body };
}

export type Program = {
  function_definition: Function;
};

export function Program(function_definition: Function): Program {
  return { function_definition };
}
