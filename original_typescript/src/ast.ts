import { Identifier } from "./shared";

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

export type LogicalNot = { kind: "logical-not"; expr: Expr; op: "!" };
export function LogicalNot(expr: Expr): LogicalNot {
  return { kind: "logical-not", op: "!", expr };
}

export type UnaryExpr = Complement | UnaryMinus | LogicalNot;

export type RelopName =
  | "less"
  | "less-eq"
  | "greater"
  | "greater-eq"
  | "equal"
  | "not-equal";

export type BinaryOpName =
  | "plus"
  | "divide"
  | "multiply"
  | "subtract"
  | "remainder"
  | "and"
  | "or"
  | RelopName;

export type BinaryExpr = {
  kind: "binary-expr";
  operator: BinaryOpName;
  lhs: Expr;
  rhs: Expr;
};
export function BinaryExpr(
  operator: BinaryOpName,
  lhs: Expr,
  rhs: Expr
): BinaryExpr {
  return { kind: "binary-expr", operator, lhs, rhs };
}

export type Var = {
  kind: "var";
  name: Identifier;
};
export function Var(name: Identifier): Var {
  return { kind: "var", name };
}

export type Assignment = {
  kind: "assignment";
  // Any Expr is allowed for the lhs during parsing. We enforce
  // that it must be an lvalue during semantic analysis.
  lhs: Expr;
  rhs: Expr;
};
export function Assignment(lhs: Expr, rhs: Expr): Assignment {
  return { kind: "assignment", lhs, rhs };
}

export type Conditional = {
  kind: "conditional";
  cond: Expr;
  trueExpr: Expr;
  falseExpr: Expr;
};
export function Conditional(
  cond: Expr,
  trueExpr: Expr,
  falseExpr: Expr
): Conditional {
  return { kind: "conditional", cond, trueExpr, falseExpr };
}

/**
 * The Expr type after parsing but before semantic analysis
 */
export type Expr =
  | Constant
  | UnaryExpr
  | BinaryExpr
  | Var
  | Assignment
  | Conditional;

export type ReturnStmt = {
  kind: "return-stmt";
  expr: Expr;
};
export function ReturnStmt(expr: Expr): ReturnStmt {
  return { kind: "return-stmt", expr };
}

export type ExprStmt = {
  kind: "expr-stmt";
  expr: Expr;
};
export function ExprStmt(expr: Expr): ExprStmt {
  return { kind: "expr-stmt", expr };
}

// A null statement i.e. just a semicolon
export type NullStmt = {
  kind: "null-stmt";
};
export function NullStmt(): NullStmt {
  return { kind: "null-stmt" };
}

export type IfStmt = {
  kind: "if-stmt";
  cond: Expr;
  thenStmt: Stmt;
  elseStmt?: Stmt;
};
export function IfStmt(cond: Expr, thenStmt: Stmt, elseStmt?: Stmt): IfStmt {
  return { kind: "if-stmt", cond, thenStmt, elseStmt };
}

export type Stmt = ReturnStmt | ExprStmt | NullStmt | IfStmt;

export type Declaration = {
  kind: "declaration";
  name: Identifier;
  init: Expr | null;
};
export function Declaration(name: Identifier, init: Expr | null): Declaration {
  const res: Declaration = { kind: "declaration", name, init };
  return res;
}

// Things that can appear at the top-level in a function
export type BlockItem = Stmt | Declaration;

export type Function = {
  name: Identifier;
  body: BlockItem[];
};

export function Function(name: Identifier, body: BlockItem[]): Function {
  return { name, body };
}

export type Program = {
  function_definition: Function;
};

export function Program(function_definition: Function): Program {
  return { function_definition };
}
