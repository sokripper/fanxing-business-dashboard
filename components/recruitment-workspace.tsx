'use client';

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, FileText, Plus, Sparkles, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RecruitmentView = 'jd' | 'ranking';
type JdStatus = '待调优' | '已确认';
type Position = {
  id: string;
  company: string;
  industry: string;
  companyContext: string;
  title: string;
  city: string;
  headcount: number;
  requirements: string;
  jd: string;
  status: JdStatus;
  updated: string;
};
type Candidate = {
  id: string;
  name: string;
  currentTitle: string;
  experience: string;
  scoreByPosition: Record<string, number>;
  reason: string;
  risk: string;
};

const initialPositions: Position[] = [
  {
    id: 'JOB-2026-018',
    company: '华中汽车科技',
    industry: '汽车科技',
    companyContext: '面向整车及域控制器项目提供软件测试与交付服务。',
    title: '高级汽车软件测试工程师',
    city: '武汉',
    headcount: 2,
    requirements:
      '5 年以上汽车电子测试经验；熟悉 CAN、UDS；有整车或域控制器项目经验。',
    status: '已确认',
    updated: '今天 10:24',
    jd: '岗位职责\n1. 负责域控制器及车载软件测试方案设计与执行；\n2. 建立 CAN、UDS 等通信协议测试用例；\n3. 跟踪缺陷闭环并输出质量分析。\n\n任职要求\n1. 本科及以上学历，计算机、车辆工程或相关专业；\n2. 5 年以上汽车电子或车载软件测试经验；\n3. 熟悉 CAN、UDS 及常用测试工具；\n4. 具备整车厂或域控制器项目经验优先。',
  },
  {
    id: 'JOB-2026-017',
    company: '梵行数字',
    industry: '企业服务',
    companyContext: '为企业提供 AI 数字员工和业务流程自动化解决方案。',
    title: 'AI 产品经理',
    city: '武汉',
    headcount: 1,
    requirements:
      '3 年以上 B 端产品经验；能完成 AI 场景抽象、需求设计和交付推进。',
    status: '待调优',
    updated: '昨天 16:40',
    jd: '岗位职责\n1. 负责企业 AI 产品的需求分析、方案设计与落地；\n2. 与业务、算法和研发团队协作，推动项目交付；\n3. 持续跟踪产品效果并完成迭代。\n\n任职要求\n1. 本科及以上学历，3 年以上 B 端产品经验；\n2. 熟悉 AI 产品设计和业务流程抽象；\n3. 具备良好的客户沟通和项目推进能力。',
  },
];

const initialCandidates: Candidate[] = [
  {
    id: 'C-1068',
    name: '周宁',
    currentTitle: '汽车软件测试工程师',
    experience: '6 年 · 武汉',
    scoreByPosition: { 'JOB-2026-018': 92, 'JOB-2026-017': 58 },
    reason: '车载测试经验完整，CAN、UDS 与自动化能力匹配。',
    risk: '期望薪资略高于岗位区间。',
  },
  {
    id: 'C-1067',
    name: '陈川',
    currentTitle: '域控制器测试工程师',
    experience: '5 年 · 合肥',
    scoreByPosition: { 'JOB-2026-018': 89, 'JOB-2026-017': 55 },
    reason: '域控制器和 HIL 测试经历与岗位高度相关。',
    risk: '工作地点需要进一步确认。',
  },
  {
    id: 'C-1066',
    name: '王琳',
    currentTitle: 'B 端产品经理',
    experience: '4 年 · 武汉',
    scoreByPosition: { 'JOB-2026-017': 91, 'JOB-2026-018': 42 },
    reason: '具备 AI 产品从需求到交付的完整经历。',
    risk: '大型客户复杂组织推进经验需核实。',
  },
  {
    id: 'C-1065',
    name: '李泽',
    currentTitle: '测试开发工程师',
    experience: '4 年 · 武汉',
    scoreByPosition: { 'JOB-2026-018': 76, 'JOB-2026-017': 61 },
    reason: '自动化测试能力较强，学习迁移成本可控。',
    risk: '汽车电子与通信协议经验偏少。',
  },
];

export default function RecruitmentWorkspace() {
  const [view, setView] = useState<RecruitmentView>('jd');
  const [positions, setPositions] = useState(initialPositions);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedPositionId, setSelectedPositionId] = useState(
    initialPositions[0].id,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const currentPosition =
    positions.find((item) => item.id === selectedPositionId) ?? positions[0];
  const confirmedPositions = positions.filter(
    (item) => item.status === '已确认',
  );
  const rankingPosition =
    confirmedPositions.find((item) => item.id === selectedPositionId) ??
    confirmedPositions[0];

  function updateJd(value: string) {
    setPositions((items) =>
      items.map((item) =>
        item.id === currentPosition.id
          ? { ...item, jd: value, status: '待调优', updated: '刚刚' }
          : item,
      ),
    );
  }
  function confirmJd() {
    setPositions((items) =>
      items.map((item) =>
        item.id === currentPosition.id
          ? { ...item, status: '已确认', updated: '刚刚' }
          : item,
      ),
    );
    setNotice('JD 已确认，可以上传简历进行匹配排序。');
    setView('ranking');
  }
  function importResumes(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !rankingPosition) return;
    const additions = files.map(
      (file, index): Candidate => ({
        id: `C-${1100 + candidates.length + index}`,
        name:
          file.name.replace(/\.(pdf|docx?|txt)$/i, '').slice(0, 12) ||
          `候选人${index + 1}`,
        currentTitle: '待从简历解析',
        experience: '信息待解析',
        scoreByPosition: { [rankingPosition.id]: 82 - index * 4 },
        reason: '简历已进入解析与匹配流程，等待生成完整依据。',
        risk: '关键信息尚未完成人工复核。',
      }),
    );
    setCandidates((items) => [...additions, ...items]);
    setNotice(`已接收 ${files.length} 份简历并加入当前岗位排序。`);
    event.target.value = '';
  }

  return (
    <section className="workspace-content min-h-screen bg-[#f7f9fc]">
      <header className="mx-5 rounded-2xl border bg-white px-5 py-5 shadow-sm sm:mx-8 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">人才与组织</p>
            <h1>招聘助手</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              只聚焦两个核心场景：JD 生成与调优、简历匹配与排序
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            新建岗位 JD
          </Button>
        </div>
        <nav
          className="mt-5 grid max-w-xl grid-cols-2 rounded-xl bg-slate-100 p-1"
          aria-label="招聘核心流程"
        >
          <FlowTab
            active={view === 'jd'}
            step="01"
            icon={FileText}
            label="JD 生成与调优"
            onClick={() => setView('jd')}
          />
          <FlowTab
            active={view === 'ranking'}
            step="02"
            icon={Users}
            label="简历匹配与排序"
            onClick={() => setView('ranking')}
          />
        </nav>
      </header>
      {notice && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:mx-8">
          <span>{notice}</span>
          <button className="text-xs" onClick={() => setNotice('')}>
            关闭
          </button>
        </div>
      )}
      <div className="p-5 sm:p-8">
        {view === 'jd' && (
          <JdFlow
            positions={positions}
            current={currentPosition}
            onSelect={setSelectedPositionId}
            onChange={updateJd}
            onConfirm={confirmJd}
            onCreate={() => setCreateOpen(true)}
          />
        )}
        {view === 'ranking' && (
          <RankingFlow
            positions={confirmedPositions}
            selectedId={rankingPosition?.id ?? ''}
            onSelect={setSelectedPositionId}
            candidates={candidates}
            onImport={importResumes}
          />
        )}
      </div>
      <CreatePositionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(position) => {
          setPositions((items) => [position, ...items]);
          setSelectedPositionId(position.id);
          setCreateOpen(false);
          setView('jd');
          setNotice('JD 初稿已生成，请由 HR 调优并确认。');
        }}
      />
    </section>
  );
}

function FlowTab({
  active,
  step,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  step: string;
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-muted-foreground hover:text-slate-900'}`}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-lg ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
      >
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-[10px] font-semibold tracking-wider opacity-60">
          STEP {step}
        </span>
        <strong className="text-sm">{label}</strong>
      </span>
    </button>
  );
}

function JdFlow({
  positions,
  current,
  onSelect,
  onChange,
  onConfirm,
  onCreate,
}: {
  positions: Position[];
  current: Position;
  onSelect: (id: string) => void;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="font-semibold">岗位 JD</h2>
            <p className="mt-1 text-xs text-muted-foreground">{positions.length} 个岗位</p>
          </div>
          <button
            onClick={onCreate}
            className="flex size-8 items-center justify-center rounded-lg border hover:bg-slate-50"
            aria-label="新建岗位"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="mt-4 space-y-1">
          {positions.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-xl p-3 text-left ${current.id === item.id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <strong className="min-w-0 flex-1 truncate text-sm">{item.title}</strong>
                <Status value={item.status} />
              </div>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {item.company} · {item.updated}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{current.title}</h2>
              <Status value={current.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {current.company} · {current.industry} · {current.city} · {current.headcount} 人
            </p>
          </div>
          <Button onClick={onConfirm} disabled={!current.jd.trim()}>
            <CheckCircle2 />
            确认 JD 并进入简历排名
          </Button>
        </div>
        <div className="grid lg:grid-cols-[.78fr_1.22fr]">
          <div className="border-b p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold text-muted-foreground">生成依据</p>
            <div className="mt-4 space-y-4 text-sm leading-6">
              <Fact
                label="公司信息"
                value={`${current.company}｜${current.industry}\n${current.companyContext}`}
              />
              <Fact label="岗位需求" value={current.requirements} />
              <Fact
                label="工作信息"
                value={`${current.city}｜招聘 ${current.headcount} 人`}
              />
            </div>
            <div className="mt-5 rounded-xl bg-violet-50 p-4 text-xs leading-6 text-violet-800">
              <strong className="flex items-center gap-1.5">
                <Sparkles size={14} />
                生成逻辑
              </strong>
              <p className="mt-1">
                公司背景和岗位事实用于生成初稿；HR 可直接修改，确认后的版本才进入简历匹配。
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">JD 内容</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  直接修改即可完成调优
                </p>
              </div>
              <span className="text-xs text-blue-700">编辑后自动标记为待调优</span>
            </div>
            <Textarea
              className="min-h-[520px] resize-y leading-7"
              value={current.jd}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function RankingFlow({
  positions,
  selectedId,
  onSelect,
  candidates,
  onImport,
}: {
  positions: Position[];
  selectedId: string;
  onSelect: (id: string) => void;
  candidates: Candidate[];
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const ranked = useMemo(
    () =>
      [...candidates].sort(
        (a, b) =>
          (b.scoreByPosition[selectedId] ?? 0) -
          (a.scoreByPosition[selectedId] ?? 0),
      ),
    [candidates, selectedId],
  );
  const position =
    positions.find((item) => item.id === selectedId) ?? positions[0];
  if (!position)
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
        <FileText className="mx-auto text-slate-300" />
        <h2 className="mt-4 font-semibold">还没有已确认的 JD</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          请先在第一步完成 JD 调优并确认。
        </p>
      </div>
    );
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">选择已确认 JD</p>
            <h2 className="mt-1 text-lg font-semibold">{position.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {position.company} · {position.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedId}
              onChange={(event) => onSelect(event.target.value)}
              className="h-9 min-w-64 rounded-lg border bg-white px-3 text-sm"
            >
              {positions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.company}
                </option>
              ))}
            </select>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white">
              <Upload size={15} />
              上传简历
              <input
                className="hidden"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={onImport}
              />
            </label>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-semibold">匹配排名</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              依据已确认 JD 生成分数、匹配理由和待核实项
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{ranked.length} 份简历</span>
        </div>
        <div className="divide-y">
          {ranked.map((item, index) => {
            const score = item.scoreByPosition[selectedId] ?? 50;
            return (
              <article
                key={item.id}
                className="grid gap-4 p-5 lg:grid-cols-[110px_1fr_1.3fr_1.2fr] lg:items-center"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full font-semibold ${index < 3 ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                  >
                    #{index + 1}
                  </span>
                  <strong
                    className={
                      score >= 85
                        ? 'text-emerald-700'
                        : score >= 70
                          ? 'text-blue-700'
                          : 'text-muted-foreground'
                    }
                  >
                    {score} 分
                  </strong>
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.currentTitle} · {item.experience}
                  </p>
                </div>
                <div className="text-xs leading-5">
                  <strong className="text-emerald-700">匹配理由</strong>
                  <p className="mt-1 text-muted-foreground">{item.reason}</p>
                </div>
                <div className="text-xs leading-5">
                  <strong className="text-amber-700">待核实</strong>
                  <p className="mt-1 text-muted-foreground">{item.risk}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Status({ value }: { value: JdStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${value === '已确认' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {value}
    </span>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 whitespace-pre-line">{value}</p>
    </div>
  );
}


function CreatePositionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (position: Position) => void;
}) {
  const [form, setForm] = useState({
    company: '',
    industry: '',
    companyContext: '',
    title: '',
    city: '武汉',
    headcount: '1',
    requirements: '',
    mustHave: '',
    niceToHave: '',
    salary: '',
  });
  const ready =
    form.company.trim() &&
    form.title.trim() &&
    form.requirements.trim() &&
    form.mustHave.trim();
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  function generate() {
    if (!ready) return;
    const id = `JOB-2026-${String(20 + Math.floor(Math.random() * 70)).padStart(3, '0')}`;
    const jd = `岗位职责\n1. 围绕${form.company.trim()}的业务目标，承担${form.title.trim()}相关工作；\n2. 与客户及内部团队协作，推动工作按计划完成；\n3. 持续沉淀方法并优化交付结果。\n\n任职要求\n1. ${form.requirements.trim()}；\n2. 必备条件：${form.mustHave.trim()}；${form.niceToHave.trim() ? `\n3. 优先条件：${form.niceToHave.trim()}；` : ''}${form.salary.trim() ? `\n4. 薪酬范围：${form.salary.trim()}。` : ''}`;
    onCreate({
      id,
      company: form.company.trim(),
      industry: form.industry.trim() || '待确认',
      companyContext: form.companyContext.trim() || '公司信息待补充。',
      title: form.title.trim(),
      city: form.city.trim() || '待确认',
      headcount: Math.max(Number(form.headcount) || 1, 1),
      requirements: `${form.requirements.trim()}；必备：${form.mustHave.trim()}${form.niceToHave.trim() ? `；优先：${form.niceToHave.trim()}` : ''}`,
      jd,
      status: '待调优',
      updated: '刚刚',
    });
    setForm({
      company: '',
      industry: '',
      companyContext: '',
      title: '',
      city: '武汉',
      headcount: '1',
      requirements: '',
      mustHave: '',
      niceToHave: '',
      salary: '',
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:!max-w-[760px]">
        <DialogHeader>
          <DialogTitle>输入公司与岗位需求</DialogTitle>
          <DialogDescription>
            系统据此生成 JD 初稿，生成后仍由 HR 调优确认。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3 sm:grid-cols-2">
          <Field label="公司名称 *">
            <Input
              value={form.company}
              onChange={(event) => set('company', event.target.value)}
              placeholder="客户或用人公司名称"
            />
          </Field>
          <Field label="所属行业">
            <Input
              value={form.industry}
              onChange={(event) => set('industry', event.target.value)}
              placeholder="例如：汽车科技"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="公司基本信息">
              <Textarea
                value={form.companyContext}
                onChange={(event) => set('companyContext', event.target.value)}
                placeholder="公司业务、项目背景、团队情况等"
                className="min-h-20"
              />
            </Field>
          </div>
          <Field label="岗位名称 *">
            <Input
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="例如：高级测试工程师"
            />
          </Field>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="工作地点">
              <Input
                value={form.city}
                onChange={(event) => set('city', event.target.value)}
              />
            </Field>
            <Field label="人数">
              <Input
                inputMode="numeric"
                value={form.headcount}
                onChange={(event) => set('headcount', event.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="岗位基本需求 *">
              <Textarea
                value={form.requirements}
                onChange={(event) => set('requirements', event.target.value)}
                placeholder="职责范围、经验年限、学历等"
                className="min-h-20"
              />
            </Field>
          </div>
          <Field label="必须具备 *">
            <Input
              value={form.mustHave}
              onChange={(event) => set('mustHave', event.target.value)}
              placeholder="关键技能或项目经验"
            />
          </Field>
          <Field label="优先条件">
            <Input
              value={form.niceToHave}
              onChange={(event) => set('niceToHave', event.target.value)}
              placeholder="加分项，可留空"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="薪酬范围">
              <Input
                value={form.salary}
                onChange={(event) => set('salary', event.target.value)}
                placeholder="可留空"
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={!ready} onClick={generate}>
            <Sparkles />
            生成 JD 初稿
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
