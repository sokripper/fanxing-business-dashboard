export const companies = [
  '武汉梵行数字科技有限公司',
  '上海梵行科技有限公司',
  '武汉传思科技有限公司',
  '武汉睿翼智翔科技有限公司',
  '武汉梵行人力资源服务有限公司',
];

export const projects = {
  AI政务数字员工知识库: { stage: '产品交付', iteration: '202609' },
  'Seedance2.0产品': { stage: '月度结算', iteration: '202609' },
  客户数字化运营项目: { stage: '持续服务', iteration: '2026第三季度' },
};
export type Project = keyof typeof projects;
export const expenseTypes = ['项目费用', '运营费用', '销售费用'];
export const scenarioLabels = {
  pass: '正常示例',
  degraded: '验真接口异常',
  blocked: '抬头不符',
  expired: '发票超过半年',
  duplicate: '票据金额已全部报销',
  suspected: '历史有记录，金额待核对',
};
export type Scenario = keyof typeof scenarioLabels;
export type Invoice = {
  fileName: string;
  size: string;
  buyer: string;
  item: string;
  gross: string;
  source: 'sample' | 'manual';
  issuedAt: string;
  hotelCity: string;
  nightlyAmounts: string;
};
export const samples: Record<string, Invoice> = {
  software: {
    fileName: '软件服务费_电子发票.pdf',
    size: '382 KB',
    buyer: companies[0],
    item: '信息技术服务 · 软件服务费',
    gross: '1280.00',
    source: 'sample',
    issuedAt: '2026-09-01',
    hotelCity: '',
    nightlyAmounts: '',
  },
  hotel: {
    fileName: '住宿费_电子发票.pdf',
    size: '256 KB',
    buyer: companies[1],
    item: '住宿服务 · 住宿费',
    gross: '680.00',
    source: 'sample',
    issuedAt: '2026-09-01',
    hotelCity: '上海',
    nightlyAmounts: '340, 340',
  },
  hardware: {
    fileName: '电脑配件_电子发票.pdf',
    size: '310 KB',
    buyer: companies[2],
    item: '计算机配件 · 显示器',
    gross: '980.00',
    source: 'sample',
    issuedAt: '2026-09-01',
    hotelCity: '',
    nightlyAmounts: '',
  },
};
export const reimbursementTypes = [
  '人力采购',
  '软件采购',
  '硬件采购',
  '其他采购',
  '差旅费用',
  '交通费用',
  '其他费用',
];
export type Form = {
  company: string;
  expenseType: string;
  project: string;
  reimbursementType: string;
  description: string;
  amount: string;
  invoiceAmount: string;
  allowanceAmount: string;
  declaredDays: string;
  org: string;
  subDepartment: string;
  account: string;
};

function normalizeName(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, '');
}

export function matchedCompany(buyer: string): string {
  if (!buyer.trim()) return '';
  return (
    companies.find(
      (company) => normalizeName(company) === normalizeName(buyer),
    ) ?? ''
  );
}

export function suggestedType(item: string): string {
  if (!item.trim()) return '';
  if (/软件|信息技术|云服务/.test(item)) return '软件采购';
  if (/计算机配件|电脑|显示器|硬件/.test(item)) return '硬件采购';
  if (/住宿|机票|航空|铁路|火车/.test(item)) return '差旅费用';
  if (/客运|出租车|网约车|交通运输/.test(item)) return '交通费用';
  return '其他费用';
}

export function automaticDescription(
  invoice: Invoice,
  project: string,
  expenseType: string,
): string {
  if (!invoice.item) return '';
  const item = invoice.item.split(' · ').at(-1);
  return expenseType === '项目费用' && project
    ? `${project}：${item}`
    : (item ?? '');
}

export function suggestions(
  invoice: Invoice,
  project: string,
  expenseType = '项目费用',
): Form {
  return {
    company: matchedCompany(invoice.buyer),
    expenseType,
    project: expenseType === '项目费用' ? project : '',
    reimbursementType: suggestedType(invoice.item),
    description: automaticDescription(invoice, project, expenseType),
    amount: invoice.gross,
    invoiceAmount: invoice.gross,
    allowanceAmount: '',
    declaredDays: '',
    org: 'OP组',
    subDepartment: 'AI数字员工',
    account: '本人常用账户（尾号 4832）',
  };
}

export function changeExpenseType(
  form: Form,
  invoice: Invoice,
  expenseType: string,
  edited: readonly (keyof Form)[],
): Form {
  const project = expenseType === '项目费用' ? form.project : '';
  return {
    ...form,
    expenseType,
    project,
    description: edited.includes('description')
      ? form.description
      : automaticDescription(invoice, project, expenseType),
  };
}

// Explicit allowlist: hidden project/optional fields cannot leak into the
// future approval adapter, including fields restored from older drafts.
export function submissionFields(form: Form) {
  return {
    company: form.company,
    expenseType: form.expenseType,
    ...(form.expenseType === '项目费用' ? { project: form.project } : {}),
    reimbursementType: form.reimbursementType,
    description: form.description,
    amount: form.amount,
    invoiceAmount: form.invoiceAmount,
    ...(form.allowanceAmount !== ''
      ? {
          allowanceAmount: form.allowanceAmount,
          declaredDays: form.declaredDays,
        }
      : {}),
    org: form.org,
    subDepartment: form.subDepartment,
    account: form.account,
  };
}

export function applySuggestions(
  current: Form,
  suggested: Form,
  edited: readonly (keyof Form)[],
): Form {
  const next = { ...current };
  for (const key of Object.keys(suggested) as (keyof Form)[]) {
    if (!edited.includes(key)) next[key] = suggested[key];
  }
  return withTotal(next);
}

// The total is derived from distinct expense lines; allowances never consume
// invoice value. Revalidate this invariant again on the eventual server endpoint.
export function withTotal(form: Form): Form {
  const invoiceAmount = cents(form.invoiceAmount);
  const allowanceAmount =
    form.allowanceAmount === '' ? 0 : cents(form.allowanceAmount);
  const total =
    invoiceAmount === null || allowanceAmount === null
      ? null
      : invoiceAmount + allowanceAmount;
  return {
    ...form,
    amount:
      total === null || !Number.isSafeInteger(total)
        ? ''
        : (total / 100).toFixed(2),
  };
}

export function cents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

export function money(value: string): string {
  const valueInCents = cents(value);
  return valueInCents === null
    ? '—'
    : (valueInCents / 100).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export type Issue = {
  key: string;
  title: string;
  detail: string;
  level: 'error' | 'warning';
};
// Snapshot of finance-policy.json 2026-09-11.4 and confirmed user corrections.
// This prototype runs deterministic prechecks only, not approval or tax services.
export const policy = {
  version: '2026-09-11.4',
  months: 6,
  hotelLimits: { 北上广深: 300, 新一线: 250, 二三线: 200 },
  firstTierCities: ['北京', '上海', '广州', '深圳'],
  allowanceShort: 70,
  allowanceLong: 100,
} as const;

export function beijingDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

export function earliestInvoiceDate(submittedAt: string): string | null {
  const date = parseDate(submittedAt);
  if (!date) return null;
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - policy.months + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - policy.months,
      Math.min(date.getUTCDate(), last),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function expectedAllowance(
  days: string,
): { days: number; rate: number; cents: number } | null {
  if (!/^\d+(\.0|\.5)?$/.test(days.trim())) return null;
  const n = Number(days);
  const rate = n <= 7 ? policy.allowanceShort : policy.allowanceLong;
  const result = n * rate * 100;
  return Number.isSafeInteger(result) ? { days: n, rate, cents: result } : null;
}

export const isHotel = (invoice: Invoice) => /住宿|客房/.test(invoice.item);
export type Check = { key: string; label: string; value: string };
export type RuleEvidence = {
  // Trusted adapter inputs. No employee checkbox may supply these in production.
  submittedAt?: string;
  confirmedWorkDays?: string;
  hotelTier?: keyof typeof policy.hotelLimits;
  history?: 'clear' | 'fully-reimbursed' | 'suspected' | 'unavailable';
};

export function review(
  form: Form,
  invoice: Invoice,
  scenario: Scenario,
  evidence: RuleEvidence = {},
) {
  const issues: Issue[] = [];
  const checks: Check[] = [];
  const submittedAt = evidence.submittedAt ?? beijingDate();
  const earliest = earliestInvoiceDate(submittedAt);
  const demo = invoice.source === 'sample';
  const add = (
    key: string,
    label: string,
    value: string,
    detail?: string,
    level: Issue['level'] = 'warning',
  ) => {
    checks.push({ key, label, value });
    if (detail) issues.push({ key, title: value, detail, level });
  };
  if (!expenseTypes.includes(form.expenseType))
    add(
      'expense-type',
      '费用归属',
      '请选择费用类型',
      '按本笔支出选择项目费用、运营费用或销售费用。',
      'error',
    );
  else if (
    form.expenseType === '项目费用' &&
    !Object.hasOwn(projects, form.project)
  )
    add(
      'project',
      '费用归属',
      '请选择所属项目',
      '只有项目费用需要项目名称；运营费用和销售费用无需选择项目。',
      'error',
    );
  for (const [key, label] of [
    ['org', '组织结构'],
    ['subDepartment', '子部门组织'],
    ['account', '收款账户'],
  ] as const) {
    if (!form[key].trim())
      add(
        key,
        label,
        `请补充${label}`,
        `点击对应信息旁的“补充”，完成必填项后再提交。`,
        'error',
      );
  }
  if (!companies.includes(form.company)) {
    add(
      'company',
      '付款公司',
      '请选择本单付款公司',
      '付款公司必须从已确认的五个主体中选择。',
      'error',
    );
  } else if (
    (invoice.buyer &&
      normalizeName(invoice.buyer) !== normalizeName(form.company)) ||
    (demo && scenario === 'blocked')
  ) {
    add(
      'buyer',
      '发票抬头',
      '发票抬头与付款公司不一致',
      demo && scenario === 'blocked'
        ? '这是抬头不符的演示结果。请确认付款主体或更换发票；可在演示设置恢复。'
        : `发票抬头：${invoice.buyer}；本单付款公司：${form.company}。请确认付款主体，或更换正确抬头的发票。`,
      'error',
    );
  } else if (!invoice.buyer.trim()) {
    add(
      'buyer',
      '发票抬头',
      '发票抬头待核对',
      '未读取到购方名称，请补充票面信息，或交财务核对。',
    );
  } else add('buyer', '发票抬头', '与本单付款公司一致');

  if (!form.description.trim())
    add(
      'description',
      '报销内容',
      '请补充报销内容',
      '填写这笔费用的具体用途。',
      'error',
    );
  if (!reimbursementTypes.includes(form.reimbursementType))
    add('type', '报销类型', '请选择报销类型', '请按实际用途选择。', 'error');

  const requested = cents(form.amount);
  const invoiced = cents(form.invoiceAmount);
  const allowance =
    form.allowanceAmount === '' ? 0 : cents(form.allowanceAmount);
  const gross = cents(invoice.gross);
  if (
    requested === null ||
    requested <= 0 ||
    invoiced === null ||
    allowance === null
  ) {
    add(
      'amount',
      '费用合计',
      '请填写有效的报销金额',
      '票据费用和津贴分别填写，不能为负数；合计大于 0，最多保留两位小数。',
      'error',
    );
  } else if (requested !== invoiced + allowance) {
    add(
      'total',
      '费用合计',
      '报销总额与明细合计不一致',
      `票据费用 ¥${money(form.invoiceAmount)} + 津贴 ¥${money(form.allowanceAmount || '0')}，应合计 ¥${((invoiced + allowance) / 100).toFixed(2)}。`,
      'error',
    );
  } else
    add(
      'total',
      '费用合计',
      `¥${money(form.invoiceAmount)} 票据费用 + ¥${money(form.allowanceAmount || '0')} 津贴 = ¥${money(form.amount)}`,
    );
  if (gross === null || gross <= 0) {
    add(
      'invoice-value',
      '票据金额',
      '票面金额待核对',
      '请补充发票价税合计。不能用报销金额代替票面金额进行验真。',
    );
  } else if (invoiced !== null && invoiced > gross) {
    add(
      'invoice-value',
      '票据金额',
      '票据报销金额超过发票价税合计',
      `本次票据费用 ¥${money(form.invoiceAmount)}，票面 ¥${money(invoice.gross)}，超出 ¥${((invoiced - gross) / 100).toFixed(2)}。请调整票据费用；津贴单独填写，不占用发票金额。`,
      'error',
    );
  } else
    add(
      'invoice-value',
      '票据金额',
      `票面 ¥${money(invoice.gross)}；允许只报销其中一部分`,
    );

  let issuedAt = invoice.issuedAt;
  if (demo && scenario === 'expired' && earliest) {
    issuedAt = new Date(parseDate(earliest)!.getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
  }
  if (!parseDate(issuedAt) || !earliest) {
    add(
      'date',
      '发票日期',
      '发票日期待核对',
      '开票日期缺失或格式不正确，交财务复核；不直接判定为过期。',
    );
  } else if (issuedAt > submittedAt || issuedAt < earliest) {
    add(
      'date',
      '发票日期',
      issuedAt > submittedAt
        ? '开票日期晚于本次提交日'
        : '发票已超过半年报销期限',
      `开票日 ${issuedAt}${demo && scenario === 'expired' ? '（模拟）' : ''}；按本次提交日 ${submittedAt} 计算，可用区间为 ${earliest} 至 ${submittedAt}，包含边界日。请核对日期或更换符合期限的发票。`,
      'error',
    );
  } else
    add(
      'date',
      '发票日期',
      `${issuedAt}，在 ${earliest} 至 ${submittedAt} 范围内`,
    );

  const history =
    evidence.history ??
    (demo
      ? scenario === 'duplicate'
        ? 'fully-reimbursed'
        : scenario === 'suspected'
          ? 'suspected'
          : 'clear'
      : 'unavailable');
  if (history === 'fully-reimbursed') {
    add(
      'history',
      '历史报销',
      '这张发票的金额已全部报销',
      `${demo ? '示例记录显示' : '已确认记录显示'}本票金额已全部报销，不能再次占用。请移除该票，或先向财务核对原报销记录。`,
      'error',
    );
  } else if (history === 'suspected') {
    add(
      'history',
      '历史报销',
      '这张发票有历史记录，需核对已报金额',
      '允许部分报销，不能仅因发票出现过就判重复。请由财务核对已报金额及剩余额度。',
    );
  } else
    checks.push({
      key: 'history',
      label: '历史报销',
      value:
        history === 'clear'
          ? `${demo ? '示例：' : ''}核查范围内未发现重复占用`
          : '历史台账未接入，待财务核对',
    });

  if (form.allowanceAmount !== '') {
    const confirmed =
      evidence.confirmedWorkDays === undefined
        ? null
        : expectedAllowance(evidence.confirmedWorkDays);
    if (!confirmed) {
      add(
        'allowance',
        '出差津贴',
        '津贴需等待人时确认后复核',
        '员工填写的天数仅供参考。以同一行程的人时确认节点为准：不超过 7 天全部按 70 元/天，超过 7 天全部按 100 元/天；不同出差行程不合并计算。',
      );
    } else if (allowance === null) {
      checks.push({
        key: 'allowance',
        label: '出差津贴',
        value: '金额格式有误，尚不能核对',
      });
    } else if (allowance !== confirmed.cents) {
      add(
        'allowance',
        '出差津贴',
        '津贴金额与已确认人时不一致',
        `已确认 ${confirmed.days} 天 × ¥${confirmed.rate}/天，应为 ¥${(confirmed.cents / 100).toFixed(2)}；本次填写 ¥${money(form.allowanceAmount)}。请核对，或附说明交财务复核。`,
      );
    } else
      add(
        'allowance',
        '出差津贴',
        `${demo ? '示例人时：' : ''}${confirmed.days} 天 × ¥${confirmed.rate}/天 = ¥${(confirmed.cents / 100).toFixed(2)}（不分段）`,
      );
  }

  if (isHotel(invoice)) {
    const city = invoice.hotelCity.trim().replace(/市$/, '');
    const tier = policy.firstTierCities.some((name) => name === city)
      ? '北上广深'
      : evidence.hotelTier;
    const amounts = invoice.nightlyAmounts
      .trim()
      .split(/[,，;；\n]+/)
      .map((x) => cents(x.trim()));
    if (!city || !tier || amounts.some((n) => n === null || n <= 0)) {
      add(
        'hotel',
        '住宿费用',
        '住宿标准还需财务复核',
        '需按实际入住城市和每晚房费核对。北上广深 300 元/晚、新一线 250 元/晚、二三线 200 元/晚；城市档位未确认时不自行判断。可补充住宿明细后继续提交复核。',
      );
    } else {
      const limit = policy.hotelLimits[tier] * 100;
      const excess = amounts
        .map((n, i) => ({ amount: n!, night: i + 1 }))
        .filter((x) => x.amount > limit);
      if (excess.length)
        add(
          'hotel',
          '住宿费用',
          '部分住宿费用超过标准，请补充说明',
          `${city} 按 ¥${limit / 100}/晚核对；${excess.map((x) => `第 ${x.night} 晚 ¥${(x.amount / 100).toFixed(2)}`).join('、')} 超出。交财务确认特殊审批，不自动驳回，也不按平均房价放行。`,
        );
      else if (
        gross !== null &&
        amounts.reduce<number>((sum, n) => sum + n!, 0) !== gross
      ) {
        add(
          'hotel',
          '住宿费用',
          '逐晚房费与票面金额未对应，请财务复核',
          '每晚金额均在标准内，但合计与本张住宿发票价税合计不同。请确认是否包含其他项目，不以平均价代替逐晚核对。',
        );
      } else
        add(
          'hotel',
          '住宿费用',
          `${amounts.length} 晚逐晚核对，均未超过 ¥${limit / 100}/晚`,
        );
    }
  }

  if (!demo) {
    add(
      'verification',
      '发票验真',
      '票据证据尚未核实，需财务复核',
      '原型未接入真实识别、税务验真和历史台账。以上仅按填写的信息预检，可继续提交复核；未查询不等于已通过。',
    );
  } else if (scenario === 'degraded') {
    add(
      'verification',
      '发票验真',
      '发票暂未完成验真，可提交财务复核',
      '这是查验服务暂时不可用的演示结果。可以继续提交，由财务核对；不会因服务异常将发票判为不合格。',
    );
  } else add('verification', '发票验真', '示例：查验一致（未调用真实接口）');
  return { issues, checks, submittedAt, earliest };
}

export function validate(
  form: Form,
  invoice: Invoice,
  scenario: Scenario,
  evidence: RuleEvidence = {},
): Issue[] {
  return review(form, invoice, scenario, evidence).issues;
}
