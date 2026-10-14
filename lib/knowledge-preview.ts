/** Synthetic product-preview content; never fetched from the company knowledge base. */
export type KnowledgeDocument = { id: string; title: string; category: string; scope: string; owner: string; summary: string; tags: string[]; content: string[] };
export const knowledgeDocuments: KnowledgeDocument[] = [
  { id: 'sample-solution', title: '企业知识助手 · 方案结构示例', category: '解决方案', scope: 'shared', owner: '产品团队（示例）', summary: '从资料整理、知识检索到回答追溯，梳理一个知识助手方案的表达方式。', tags: ['数字员工', '知识检索'], content: ['适用场景：员工需要跨文档查找资料，并回到原始内容核对。', '方案结构：业务目标、资料范围、访问权限、使用流程、验证方式。', '验收关注：引用是否可追溯、资料更新是否及时、无权访问的内容是否被排除。', '此内容仅用于页面演示，不代表公司已交付的方案或已验证的能力。'] },
  { id: 'sample-case', title: '项目复盘 · 内容模板示例', category: '项目案例', scope: 'department', owner: '交付团队（示例）', summary: '把项目背景、关键决策和交付经验整理成可复用的案例。', tags: ['项目复盘', '交付经验'], content: ['项目背景：记录客户需求、目标与约束，避免只保留最终成果。', '执行过程：整理关键节点、方案调整及其原因。', '复盘结论：说明哪些方法有效、哪些问题仍未解决，以及复用条件。', '当前是内容模板，没有包含真实客户或项目信息。'] },
  { id: 'sample-resource', title: '跨部门资源对接 · 信息清单示例', category: '共享资料', scope: 'shared', owner: '协作团队（示例）', summary: '发布需求前准备业务场景、交付范围和时间要求，便于同事提供资源。', tags: ['资源对接', '需求协作'], content: ['先写清业务场景、需要的服务、期望交付物与时间。', '补充已有材料和待确认事项，指定内部对接人。', '资源建议应保留来源和更新时间；合作能力与报价需进一步核实。', '此示例不包含供应商名单，也不构成采购建议。'] },
  { id: 'sample-note', title: '我的工作记录 · 整理示例', category: '个人笔记', scope: 'personal', owner: '预览用户', summary: '先记录问题和过程，再把可共享的结论整理进部门知识。', tags: ['工作记录'], content: ['记录本次工作的目标、采用的方法和遇到的问题。', '把尚待验证的判断与已经确认的结论分开。', '共享前确认内容范围与可见权限。此处仅展示个人知识空间的页面形式。'] },
];
export const knowledgeScopes = [{id:'all',label:'全部资料'},{id:'shared',label:'共享知识'},{id:'department',label:'部门知识'},{id:'personal',label:'个人知识'}];
export function findKnowledge(query: string, scope = 'all') {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return knowledgeDocuments.filter(d => (scope === 'all' || d.scope === scope) && terms.every(t => `${d.title} ${d.summary} ${d.tags.join(' ')}`.toLowerCase().includes(t)));
}
