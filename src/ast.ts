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

export type Expr = Constant | UnaryExpr;

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
