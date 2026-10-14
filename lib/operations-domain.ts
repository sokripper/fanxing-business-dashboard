/** Server domain: authorization precedes source access and aggregation. */
export const operationUnits = ['人力', '汽车', '数字员工'] as const;
export type OperationUnit = typeof operationUnits[number];
export type OperationsPrincipal = {
  userId: string;
  role: 'management' | 'op-lead' | 'employee';
  op?: OperationUnit;
};
export type OperationsScope = { kind: 'all' } | { kind: 'op'; op: OperationUnit };
export type SalesKey = 'signed' | 'net' | 'invoice' | 'cash' | 'pool';
export type OperationsQuery = { start: string; end: string; op: string };
export type SalesTotals = Record<SalesKey, number>;
export type NodeDetail = { id: string; project: string; name: string; owner: string; planned: string; actual: string | null; amount: number };
export type OperationsSnapshot = {
  scope: OperationsScope;
  selectedOp: string;
  availableOps: OperationUnit[];
  start: string; end: string;
  sales: SalesTotals;
  pending: number;
  poolEnsured: number; poolSeeking: number;
  salesByOp: { op: OperationUnit; values: SalesTotals }[];
  projects: { id: string; op: OperationUnit; name: string; labor: number; laborBudget: number; expense: number; expenseBudget: number; late: NodeDetail[] }[];
  revenue: { expected: number; actual: number; delta: number; details: (NodeDetail & { contribution: number })[] };
  costs: { label: string; total: number; items: { label: string; amount: number }[] }[];
  costTotal: number;
  idle: { cost: number; days: number; people: { op: OperationUnit; person: string; days: number; rate: number; cost: number }[] };
};

export function operationsScope(principal: OperationsPrincipal | null): OperationsScope | null {
  if (!principal?.userId) return null;
  if (principal.role === 'management') return { kind: 'all' };
  if (principal.role === 'op-lead' && operationUnits.includes(principal.op as OperationUnit)) {
    return { kind: 'op', op: principal.op! };
  }
  return null;
}

export function authorizeOperations(principal: OperationsPrincipal | null, query: OperationsQuery) {
  if (!principal) return { status: 401, error: '请先完成企业身份验证。' } as const;
  const scope = operationsScope(principal);
  if (!scope) return { status: 403, error: '当前身份没有经营看板访问权限，请联系管理员。' } as const;
  if (query.op !== 'all' && !operationUnits.includes(query.op as OperationUnit)) {
    return { status: 400, error: '请选择有效的 OP。' } as const;
  }
  if (scope.kind === 'op' && query.op !== scope.op) {
    return { status: 403, error: '仅可查看本人负责的 OP，不能访问全公司或其他 OP 的数据。' } as const;
  }
  if (!/^2026-0[1-9]$/.test(query.start) || !/^2026-0[1-9]$/.test(query.end) || query.start > query.end) {
    return { status: 400, error: '请选择 2026 年 1—9 月内的有效区间，开始月份不能晚于结束月份。' } as const;
  }
  return { status: 200, scope } as const;
}

/** Local-only simulation. Never use preview selection as a production identity. */
export function previewPrincipal(profile: string | null): OperationsPrincipal | null {
  if (profile === 'management') return { userId: 'preview-management', role: 'management' };
  if (profile === 'employee') return { userId: 'preview-employee', role: 'employee' };
  const op = operationUnits.find(value => profile === `op:${value}`);
  return op ? { userId: `preview-${op}`, role: 'op-lead', op } : null;
}

export function isLocalOperationsPreview(url: URL, environment: string | undefined) {
  return environment === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const emptySales = (): SalesTotals => ({ signed: 0, net: 0, invoice: 0, cash: 0, pool: 0 });

export function demoOperations(principal: OperationsPrincipal | null, query: OperationsQuery): OperationsSnapshot {
  const authorization = authorizeOperations(principal, query);
  if (authorization.status !== 200) throw new Error(authorization.error);
  const scope = authorization.scope;
  const allowedOps = scope.kind === 'all' ? [...operationUnits] : [scope.op];
  // In a real repository query, this scope must become a WHERE condition before reading rows.
  const selectedOps = allowedOps.filter(op => query.op === 'all' || op === query.op);
  const definitions = [
    { id: 'h', op: '人力' as const, name: '人力驻场服务 A', owner: '项目负责人 A', rate: 800, expenseBudget: 24, index: 0 },
    { id: 'a', op: '汽车' as const, name: '车企数据平台 B', owner: '项目负责人 B', rate: 1200, expenseBudget: 65, index: 1 },
    { id: 'd', op: '数字员工' as const, name: '数字员工应用 C', owner: '项目负责人 C', rate: 1000, expenseBudget: 32, index: 2 },
  ].filter(project => selectedOps.includes(project.op));
  const period = (value: string | null) => !!value && value.slice(0, 7) >= query.start && value.slice(0, 7) <= query.end;
  const nodes: NodeDetail[] = [];
  const salesByOp: OperationsSnapshot['salesByOp'] = [];
  const projects: OperationsSnapshot['projects'] = [];
  const people: OperationsSnapshot['idle']['people'] = [];
  let pending = 0, poolEnsured = 0, poolSeeking = 0;
  const support = [0, 0, 0, 0, 0, 0];
  for (const project of definitions) {
    const i = project.index, values = emptySales();
    const row = { id: project.id, op: project.op, name: project.name, labor: 0, laborBudget: 0, expense: 0, expenseBudget: project.expenseBudget, late: [] as NodeDetail[] };
    const person = { op: project.op, person: ['员工 A', '员工 B', '员工 C'][i], days: 0, rate: project.rate, cost: 0 };
    for (let month = 1; month <= 9; month++) {
      const key = `2026-${String(month).padStart(2, '0')}`;
      const date = (day: number) => `${key}-${String(day).padStart(2, '0')}`;
      const planned = date([28, 20, 25][i]);
      let actual: string | null = planned;
      if (i === 1 && month === 8) actual = '2026-09-05';
      if (i > 0 && month === 9) actual = null;
      const amount = i === 0 ? [70,72,74,75,76,80,82,84,86][month-1] : i === 1 ? (month < 4 ? 30 : 60) : (month < 3 ? 15 : 30);
      const node = { id: `${project.id}-${month}`, project: project.name, name: i === 0 ? `${month}月服务确认` : i === 1 ? `阶段 ${month} 验收` : `版本 ${month} 确认`, owner: project.owner, planned, actual, amount };
      nodes.push(node);
      if (period(planned) && (!actual || actual > planned)) row.late.push(node);
      if (key <= query.end) row.expense += [1.2 + .1 * month, 5 + .2 * month, 1.8 + .1 * month][i];
      if (!period(key)) continue;
      values.signed += [85+month, 150+month*2, 60+month][i];
      if (i === 1 && month === 9) pending++; else values.net += [80+month,132+month,52+month][i];
      values.invoice += [80+month,120+2*month,45+month][i];
      values.cash += [70+month,110+month,35+month][i];
      row.labor += [500+4*month,360+13*month,160+4*month][i] * project.rate / 10000;
      row.laborBudget += [550+3*month,390+4*month,210+2*month][i] * project.rate / 10000;
      const days = [4,5,6][i] + month % 3;
      person.days += days; person.cost += days * project.rate / 10000;
      [[8,12,7],[3,6,2],[1.4,2.2,.8],[4,8,5],[3,4,2],[.5,.9,.4]].forEach((rates, index) => support[index] += rates[i]);
    }
    values.pool = [140,200,80][i]; poolEnsured += [90,120,48][i]; poolSeeking += [50,80,32][i];
    salesByOp.push({ op: project.op, values }); projects.push(row); people.push(person);
  }
  const sales = emptySales();
  for (const { values } of salesByOp) for (const key of Object.keys(sales) as SalesKey[]) sales[key] += values[key];
  const expected = sum(nodes.filter(n => period(n.planned)), n => n.amount);
  const actual = sum(nodes.filter(n => period(n.actual)), n => n.amount);
  const details = nodes.map(n => ({ ...n, contribution: (period(n.planned) ? n.amount : 0) - (period(n.actual) ? n.amount : 0) })).filter(n => n.contribution !== 0);
  let periodExpense = 0;
  for (const project of definitions) for (let m=1;m<=9;m++) {
    if (period(`2026-${String(m).padStart(2,'0')}`)) periodExpense += [1.2+.1*m,5+.2*m,1.8+.1*m][project.index];
  }
  const costs = [
    { label: '成本', items: [{ label: '项目费用', amount: sum(projects,p=>p.labor) + periodExpense }] },
    { label: 'OP 费用', items: ['运营费用','销售费用','财务税费'].map((label,i)=>({ label, amount:support[i] })) },
    { label: '经营费用', items: ['交付产研费用','管理费用','财务费用'].map((label,i)=>({ label, amount:support[i+3] })) },
  ].map(group => ({ ...group, total: sum(group.items, item=>item.amount) }));
  const idle = { cost: sum(people,p=>p.cost), days: sum(people,p=>p.days), people };
  return { scope, selectedOp: query.op, availableOps: allowedOps, start:query.start, end:query.end, sales, pending, poolEnsured, poolSeeking, salesByOp, projects, revenue:{ expected, actual, delta:expected-actual, details }, costs, costTotal:sum(costs,g=>g.total)+idle.cost, idle };
}
