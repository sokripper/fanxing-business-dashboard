'use client';

import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OperationsSnapshot, SalesKey, NodeDetail } from '@/lib/operations-domain';

const money = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const salesDefinitions: { key: SalesKey; label: string; note: string }[] = [
  { key: 'signed', label: '签约金额', note: '按签约日期' },
  { key: 'net', label: '净签约金额', note: '人工确认值' },
  { key: 'invoice', label: '开票金额', note: '按开票日期' },
  { key: 'cash', label: '回款金额', note: '按实际回款日期' },
  { key: 'pool', label: '当前商机金额', note: '不受时间筛选影响' },
];
type Result = { key: string; data?: OperationsSnapshot; error?: string; status?: number };

function Budget({ actual, budget }: { actual: number; budget: number }) {
  const ratio = budget > 0 ? actual / budget * 100 : null;
  return <div className="op-budget">
    <div><strong>{money(actual)} / {money(budget)}</strong><span className={ratio !== null && ratio > 100 ? 'op-warning' : ''}>{ratio === null ? '待确认' : `${money(ratio)}%`}</span></div>
    <div className={`op-track ${ratio !== null && ratio > 100 ? 'op-track-warning' : ''}`}><i style={{ width: `${Math.min(ratio ?? 0, 100)}%` }} /></div>
  </div>;
}

function NodeRows({ rows }: { rows: (NodeDetail & { contribution?: number })[] }) {
  return <div className="op-node-list">{rows.map(node => <div className="op-node" key={node.id}>
    <div><strong>{node.project} · {node.name}</strong><p>{node.owner} · 计划 {node.planned}</p><p>{node.actual ? `实际确认 ${node.actual}` : '截至所选期末未确认'}</p></div>
    <strong className={(node.contribution ?? node.amount) > 0 ? 'op-warning' : 'op-positive'}>{node.contribution !== undefined && node.contribution > 0 ? '+' : ''}{money(node.contribution ?? node.amount)} 万</strong>
  </div>)}</div>;
}

export default function OperationsWorkspace({ previewEnabled = false, previewProfile = 'management' }: { previewEnabled?: boolean; previewProfile?: string }) {
  const profile = previewProfile;
  const [start, setStart] = useState('2026-09');
  const [end, setEnd] = useState('2026-09');
  const [op, setOp] = useState('all');
  const [salesKey, setSalesKey] = useState<SalesKey>('signed');
  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const selectedOp = previewEnabled && profile.startsWith('op:') ? profile.slice(3) : op;
  const query = new URLSearchParams({ start, end });
  if (previewEnabled) { query.set('preview', profile); query.set('op', selectedOp); }
  else if (op !== 'all') query.set('op', op);
  const requestKey = query.toString();
  const current = result?.key === requestKey ? result : null;
  const data = current?.data;

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    fetch(`/api/operations?${requestKey}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const body = await response.json() as { data?: OperationsSnapshot; error?: string };
        if (!controller.signal.aborted) setResult({ key: requestKey, status: response.status, ...(response.ok ? { data: body.data } : { error: body.error || '看板暂时不可用，请稍后重试。' }) });
      })
      .catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: '暂时无法加载经营看板，请重试。', status: 500 }); });
    return () => controller.abort();
  }, [requestKey, retry]);

  const locked = current?.status === 401 || current?.status === 403;
  const restricted = data?.scope.kind === 'op';
  const maxSales = Math.max(1, ...(data?.salesByOp.map(row => row.values[salesKey]) ?? []));

  return <section className="workspace-content native-operations">
    <div className="workspace-heading op-heading">
      <div><p className="eyebrow">经营管理</p><h1>经营看板</h1></div>
      <span className="op-access-label"><ShieldCheck size={16} />{data ? restricted ? `仅限 ${data.scope.kind === 'op' ? data.scope.op : ''} OP` : '公司管理层 · 全公司' : '按身份授权访问'}</span>
    </div>
    {!locked && <div className="op-filters">
      <div className="op-period"><label htmlFor="op-start">期间</label><input id="op-start" aria-label="开始月份" type="month" min="2026-01" max="2026-09" value={start} onChange={event=>setStart(event.target.value)} /><span>至</span><input aria-label="结束月份" type="month" min="2026-01" max="2026-09" value={end} onChange={event=>setEnd(event.target.value)} /></div>
      {data && <div className="op-organization"><span id="op-organization-label">组织</span>{restricted ? <span className="op-scope-chip"><LockKeyhole size={14} />{data.selectedOp} OP</span> : <Select value={op} onValueChange={value=>{if(value)setOp(value);}}><SelectTrigger aria-labelledby="op-organization-label"><SelectValue>{op === 'all' ? '全公司' : `${op} OP`}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">全公司</SelectItem>{data.availableOps.map(value=><SelectItem key={value} value={value}>{value} OP</SelectItem>)}</SelectContent></Select>}</div>}
      <span className="op-unit">单位：万元</span>
    </div>}
    {!current && <div className="op-loading" role="status"><ChartNoAxesCombined size={24} />正在核验访问范围并加载看板…</div>}
    {current?.error && <div className="op-access-state" role="status">
      {locked ? <LockKeyhole size={32} /> : <ChartNoAxesCombined size={32} />}
      <h2>{locked ? current.status === 401 ? '企业身份尚未连接' : '暂无经营看板权限' : '暂时无法展示看板'}</h2>
      <p>{current.error}</p>
      {locked && <p>公司管理层可查看全部经营数据，OP 负责人仅可查看本人负责的 OP。</p>}
      {!locked && current.status !== 400 && <Button variant="outline" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={16} />重新加载</Button>}
    </div>}
    {data && <div className="op-sections" key={requestKey}>
      <section className="op-panel" aria-labelledby="op-sales-title">
        <div className="op-section-heading"><h2 id="op-sales-title">销售概览</h2><span>{data.start} 至 {data.end}</span></div>
        <div className="op-sales-grid">{salesDefinitions.map(metric=><button key={metric.key} className="op-sales-metric" aria-pressed={salesKey===metric.key} onClick={()=>setSalesKey(metric.key)}><span>{metric.label}</span><strong>{money(data.sales[metric.key])}</strong><small className={metric.key==='net' && data.pending ? 'op-warning' : ''}>{metric.key==='net' && data.pending ? `另有 ${data.pending} 笔待确认` : metric.note}</small></button>)}</div>
        <div className="op-chart-heading"><h3>{salesDefinitions.find(metric=>metric.key===salesKey)?.label} · OP 构成</h3>{salesKey==='pool' && <span>确保 {money(data.poolEnsured)} 万 · 争取 {money(data.poolSeeking)} 万</span>}</div>
        <div className="op-bars">{data.salesByOp.map(row=><div key={row.op}><div className="op-bar-label"><span>{row.op} OP</span><strong>{money(row.values[salesKey])} 万</strong></div><div className="op-track" role="img" aria-label={`${row.op} OP：${money(row.values[salesKey])} 万元`}><i style={{width:`${row.values[salesKey]/maxSales*100}%`}} /></div></div>)}</div>
        <details className="op-rules"><summary>销售指标口径</summary><p>签约、开票和回款分别按对应日期汇总。无金额的框架合同不估算，框架与 PO 不重复计入。净签约仅汇总人工确认值，不自动扣采购；商机仅包含“确保、争取”，不受月份筛选影响。</p></details>
      </section>
      <section className="op-panel" aria-labelledby="op-projects-title">
        <div className="op-section-heading"><h2 id="op-projects-title">项目健康</h2><span>{data.projects.length} 个项目 · {data.projects.filter(project=>project.late.length).length} 个当期有延期</span></div>
        <div className="op-table-scroll"><table className="op-project-table"><thead><tr><th>项目 / OP</th><th>人工预算执行<small>期间实际 / 期间预算</small></th><th>费用预算执行<small>期末累计 / 项目预算</small></th><th>交付状态</th></tr></thead><tbody>{data.projects.map(project=><tr key={project.id}><td><strong>{project.name}</strong><small>{project.op} OP</small></td><td><Budget actual={project.labor} budget={project.laborBudget} /></td><td><Budget actual={project.expense} budget={project.expenseBudget} /></td><td>{project.late.length ? <details className="op-project-delay"><summary>延期 · {project.late.length} 个节点</summary><NodeRows rows={project.late} /></details> : <span className="op-status-ok">正常</span>}</td></tr>)}</tbody></table></div>
        <details className="op-rules"><summary>项目指标口径</summary><p>人工成本按实际人天 × P 值汇总，比较同期预算；费用按期末累计比较项目总费用预算，跨月不重复累加预算。期间应完成的节点逾期未确认，或实际确认晚于计划，计为延期。</p></details>
      </section>
      <section className="op-panel" aria-labelledby="op-company-title">
        <div className="op-section-heading"><h2 id="op-company-title">{restricted || data.selectedOp !== 'all' ? 'OP 经营' : '公司经营'}</h2><span>{data.selectedOp === 'all' ? '全公司' : `${data.selectedOp} OP`}</span></div>
        <div className="op-revenue"><div><span>预计确认收入</span><strong>{money(data.revenue.expected)}<small>万元</small></strong><p>按计划确认日期</p></div><div><span>实际确认收入</span><strong>{money(data.revenue.actual)}<small>万元</small></strong><p>按实际确认日期与已确认状态</p></div><div><span>确收差额</span><strong className={data.revenue.delta>0 ? 'op-warning' : ''}>{money(data.revenue.delta)}<small>万元</small></strong><p>{data.revenue.delta>0?'预计未达部分':data.revenue.delta<0?'实际高于预计':'预计与实际一致'}</p></div></div>
        <details className="op-revenue-details"><summary>查看确收差额明细</summary>{data.revenue.details.length ? <NodeRows rows={data.revenue.details} /> : <p className="op-empty">本期无跨期差额。</p>}<div className="op-bridge">净差额 <strong>{money(data.revenue.delta)} 万</strong></div></details>
        <div className="op-cost-layout"><div><div className="op-chart-heading"><h3>成本构成</h3><span>期间合计 <strong>{money(data.costTotal)} 万</strong></span></div>{data.costs.map(group=><div className="op-cost-group" key={group.label}><h4>{group.label}<span>小计 {money(group.total)} 万</span></h4>{group.items.map(item=><div className="op-cost-row" key={item.label}><span>{item.label}</span><div className="op-track"><i style={{width:`${data.costTotal ? item.amount/data.costTotal*100 : 0}%`}} /></div><strong>{money(item.amount)} 万<small>{money(data.costTotal ? item.amount/data.costTotal*100 : 0)}%</small></strong></div>)}</div>)}<div className="op-bridge"><span>含待归属闲置</span><strong>{money(data.idle.cost)} 万</strong></div></div>
        <div className="op-idle"><h3>人员闲置</h3><strong className="op-idle-number">{money(data.idle.cost)}<small>万元</small></strong><p>{money(data.idle.days)} 人天 · 已计入成本合计</p><details><summary>查看闲置人员明细</summary>{data.idle.people.map(person=><div className="op-idle-person" key={person.op}><strong>{person.person} · {person.op} OP</strong><p>{money(person.days)} 人天 × {person.rate} 元/人天</p><span>{money(person.cost)} 万</span></div>)}</details></div></div>
        <details className="op-rules"><summary>经营指标口径</summary><p>阶段金额按增量比例 × 净签约金额计算，预计和实际按各自确认日期汇总。确收差额为预计减实际；成本合计包含项目费用、OP 费用、经营费用与待归属闲置，小计及人员明细不重复叠加。</p></details>
      </section>
      <p className="op-footnote">{previewEnabled ? '当前为模拟数据。正式使用需接通企业身份、角色授权与经营数据源。' : '数据仅限当前授权范围。'}</p>
    </div>}
  </section>;
}
