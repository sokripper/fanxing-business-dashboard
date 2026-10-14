/** Workspace catalog only. Access labels never grant real backend permissions. */
export type Audience = 'employee' | 'finance' | 'management' | 'team';
export type AssistantDefinition = {
  id: string;
  name: string;
  description: string;
  audience: Audience;
  icon: 'receipt' | 'review' | 'general' | 'chart' | 'book' | 'forum' | 'briefcase';
  group: 'business' | 'management' | 'knowledge';
  accent: 'blue' | 'teal' | 'violet';
  status: 'preview' | 'planned';
  enabled: boolean;
  order: number;
  action: string;
  capabilities: string[];
  entry: { kind: 'builtin'; module: string } | { kind: 'link'; url: string };
};

// Add a catalog entry to expose an existing module or an HTTPS application.
// New business logic belongs in its own module, not in the workspace shell.
export const assistantRegistry: AssistantDefinition[] = [
  {
    id: 'expense',
    group: 'business',
    name: '报销助手',
    description: '放入发票，辅助填写报销信息。你确认后，再发起申请。',
    audience: 'employee',
    icon: 'receipt',
    accent: 'blue',
    status: 'preview',
    enabled: true,
    order: 30,
    action: '开始报销',
    capabilities: ['信息预填', '规则预检', '本人确认'],
    entry: { kind: 'builtin', module: 'expense' },
  },
  {
    id: 'finance-review',
    group: 'business',
    name: '财务审核助手',
    description: '先看具体问题，再由你复核。打印前，始终需要人工确认。',
    audience: 'finance',
    icon: 'review',
    accent: 'teal',
    status: 'preview',
    enabled: true,
    order: 40,
    action: '进入财务工作区',
    capabilities: ['问题核查', '人工复核', '打印归档'],
    entry: { kind: 'builtin', module: 'finance-review' },
  },
  {
    id: 'operations', group: 'management', name: '经营看板',
    description: '从经营指标到具体项目，查看销售、成本与项目进展。',
    audience: 'management', icon: 'chart', accent: 'blue', status: 'preview',
    enabled: true, order: 10, action: '查看经营情况',
    capabilities: ['经营汇总', 'OP 筛选', '项目下钻'],
    entry: { kind: 'builtin', module: 'operations' },
  },
  {
    id: 'recruitment', group: 'business', name: '招聘管理',
    description: '从客户需求生成岗位 JD，并完成简历匹配、排序与候选人推进。',
    audience: 'team', icon: 'briefcase', accent: 'teal', status: 'preview',
    enabled: true, order: 15, action: '进入招聘管理',
    capabilities: ['岗位管理', 'JD 生成与校准', '简历匹配排序'],
    entry: { kind: 'builtin', module: 'recruitment' },
  },
  {
    id: 'knowledge', group: 'knowledge', name: '知识中心（问答）',
    description: '通过对话查询企业知识，查找方案、案例与工作经验。',
    audience: 'team', icon: 'book', accent: 'violet', status: 'preview',
    enabled: true, order: 20, action: '进入知识中心',
    capabilities: ['知识问答', '资料溯源'],
    entry: { kind: 'builtin', module: 'knowledge' },
  },

];

export const audienceLabels: Record<Audience, string> = {
  employee: '个人使用',
  finance: '财务专属',
  management: '经营管理',
  team: '团队协作',
};
export function listAssistants(catalog = assistantRegistry) {
  return catalog
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);
}
export function safeAssistantUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export const applicationGroups = [
  { id: 'business', label: '业务办理' },
  { id: 'management', label: '经营管理' },
  { id: 'knowledge', label: '知识协作' },
] as const;
