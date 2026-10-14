/** Synthetic preview data. Never a substitute for an authorized Feishu data source. */
export type Recommendation = 'pass' | 'review' | 'fail';
export type HumanReview = 'unreviewed' | 'print_ready' | 'hold';
export type FinanceCase = {
  id: string;
  applicant: string;
  department: string;
  description: string;
  expenseType: string;
  project?: string;
  company: string;
  amountCents: number;
  invoiceTotalCents: number;
  invoiceCount: number;
  recommendation: Recommendation;
  summary: string;
  issues: { title: string; detail: string; next: string }[];
  source: 'demo';
  sourceVersion: number;
  approvalStatus: 'pending' | 'withdrawn' | 'rejected';
  review: { status: HumanReview; note: string; version: number | null };
  print: { status: 'unconfirmed' | 'confirmed'; version: number | null };
  events: string[];
};

export const recommendationLabels: Record<Recommendation, string> = {
  pass: '建议通过',
  review: '待复核',
  fail: '建议不通过',
};
export const humanLabels: Record<HumanReview, string> = {
  unreviewed: '待人工复核',
  print_ready: '已复核 · 可打印',
  hold: '已复核 · 暂不打印',
};

const fixtureInputs = [
  {
    id: 'DEMO-001',
    applicant: '员工甲',
    department: '产品组',
    description: '项目软件服务费',
    expenseType: '项目费用',
    project: '知识库项目（示例）',
    company: '武汉梵行数字科技有限公司',
    amountCents: 99999,
    invoiceTotalCents: 100000,
    invoiceCount: 1,
    recommendation: 'pass' as const,
    summary: '本次核查未发现问题，等待你确认。',
    issues: [],
  },
  {
    id: 'DEMO-002',
    applicant: '员工乙',
    department: '运营组',
    description: '办公用品采购',
    expenseType: '运营费用',
    company: '武汉传思科技有限公司',
    amountCents: 68000,
    invoiceTotalCents: 68000,
    invoiceCount: 2,
    recommendation: 'fail' as const,
    summary: '第 2 张发票的抬头与本单付款公司不一致。',
    issues: [
      {
        title: '第 2 张发票：抬头不一致',
        detail:
          '发票抬头为武汉梵行数字科技有限公司；本单付款公司为武汉传思科技有限公司。',
        next: '请申请人确认正确的付款主体，再更正报销信息或重新开票。不能只因抬头属于集团公司就放行。',
      },
    ],
  },
  {
    id: 'DEMO-003',
    applicant: '员工丙',
    department: '销售组',
    description: '客户拜访交通费',
    expenseType: '销售费用',
    company: '武汉梵行数字科技有限公司',
    amountCents: 32800,
    invoiceTotalCents: 32800,
    invoiceCount: 3,
    recommendation: 'review' as const,
    summary: '第 1 张发票暂未取得查验结果，需要人工核实。',
    issues: [
      {
        title: '第 1 张发票：查验尚无结果',
        detail: '示例中查验服务未返回有效结果，不能据此认定发票有问题。',
        next: '人工核实查验结果后补充复核记录；不需要重新读取全部附件。',
      },
    ],
  },
];

export function createDemoCases(): FinanceCase[] {
  return fixtureInputs.map((item) => ({
    ...item,
    issues: item.issues.map((issue) => ({ ...issue })),
    source: 'demo',
    sourceVersion: 1,
    approvalStatus: 'pending',
    review: { status: 'unreviewed', note: '', version: null },
    print: { status: 'unconfirmed', version: null },
    events: ['载入示例核查结果；没有调用模型或外部查验服务。'],
  }));
}

export function canConfirmPrint(item: FinanceCase) {
  return (
    item.source === 'demo' &&
    item.approvalStatus === 'pending' &&
    item.review.status === 'print_ready' &&
    item.review.version === item.sourceVersion &&
    item.print.status === 'unconfirmed'
  );
}

export function recordHumanReview(
  item: FinanceCase,
  status: Exclude<HumanReview, 'unreviewed'>,
  note: string,
): FinanceCase {
  if (item.approvalStatus !== 'pending') return item;
  if ((item.recommendation !== 'pass' || status === 'hold') && !note.trim())
    return item;
  return {
    ...item,
    review: { status, note: note.trim(), version: item.sourceVersion },
    print: { status: 'unconfirmed', version: null },
    events: [
      ...item.events,
      `人工复核（演示）：${status === 'print_ready' ? '可打印' : '暂不打印'}。${note.trim() || '已人工核对本单。'}飞书审批状态未改变。`,
    ],
  };
}

export function confirmDemoPrint(item: FinanceCase): FinanceCase {
  if (!canConfirmPrint(item)) return item;
  return {
    ...item,
    print: { status: 'confirmed', version: item.sourceVersion },
    events: [
      ...item.events,
      '已人工确认打印（演示）；打印服务未连接，未发送任何打印任务。',
    ],
  };
}

export function invalidateMaterialVersion(item: FinanceCase): FinanceCase {
  return {
    ...item,
    sourceVersion: item.sourceVersion + 1,
    review: { status: 'unreviewed', note: '', version: null },
    print: { status: 'unconfirmed', version: null },
    events: [...item.events, '材料有变化，原复核与打印确认已失效。'],
  };
}

export function caseMatches(item: FinanceCase, query: string) {
  const text = `${item.id} ${item.applicant} ${item.department} ${item.description} ${item.summary}`;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function currency(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100);
}
