'use client';

import { useState, type ComponentType, type CSSProperties } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  MessagesSquare,
  CircleHelp,
  LockKeyhole,
  PanelsTopLeft,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KnowledgeWorkspace from '@/components/knowledge-workspace';
import OperationsWorkspace from '@/components/operations-workspace';
import RecruitmentWorkspace from '@/components/recruitment-workspace';
import ExpenseAssistant from '@/components/expense-assistant';
import FinanceWorkspace, {
  type FinanceWorkspaceProps,
} from '@/components/finance-workspace';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  createDemoCases,
  type FinanceCase,
} from '@/lib/finance-preview';
import {
  listAssistants,
  safeAssistantUrl,
  type AssistantDefinition,
} from '@/lib/assistant-registry';

const icons = { receipt: ReceiptText, review: ShieldCheck, general: Sparkles, book: BookOpen, chart: ChartNoAxesCombined, forum: MessagesSquare, briefcase: BriefcaseBusiness };
const catalog = listAssistants();
const previewProfiles = [
  { value: 'management', label: '公司管理层' },
  { value: 'op:人力', label: '人力 OP 负责人' },
  { value: 'op:汽车', label: '汽车 OP 负责人' },
  { value: 'op:数字员工', label: '数字员工 OP 负责人' },
  { value: 'employee', label: '普通员工' },
];
type WorkbenchProps = { previewEnabled?: boolean; canViewOperations?: boolean };
// Built-in modules share the shell, but own their business UI independently.
const modules: Record<string, ComponentType<FinanceWorkspaceProps & { previewEnabled?: boolean; previewProfile?: string }>> = {
  expense: ExpenseAssistant,
  'finance-review': FinanceWorkspace,
  operations: OperationsWorkspace,
  recruitment: RecruitmentWorkspace,
  knowledge: KnowledgeWorkspace,
};

export default function Workbench({ previewEnabled = false, canViewOperations = false }: WorkbenchProps) {
  return (
    <SidebarProvider style={{ '--sidebar-width': '14rem' } as CSSProperties}>
      <Workspace previewEnabled={previewEnabled} canViewOperations={canViewOperations} />
    </SidebarProvider>
  );
}

function Workspace({ previewEnabled, canViewOperations }: Required<WorkbenchProps>) {
  const [previewProfile, setPreviewProfile] = useState('management');
  const operationsVisible = previewEnabled
    ? previewProfiles.some(item => item.value === previewProfile && item.value !== 'employee')
    : canViewOperations;
  const visibleCatalog = catalog.filter(item => item.id !== 'operations' || operationsVisible);
  const [active, setActive] = useState(visibleCatalog[0].id);
  const [visited, setVisited] = useState<string[]>([visibleCatalog[0].id]);
  const [help, setHelp] = useState(false);
  const [cases, setCases] = useState(createDemoCases);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { setOpenMobile } = useSidebar();
  const effectiveActive = visibleCatalog.some(item => item.id === active) ? active : visibleCatalog[0].id;
  const current = visibleCatalog.find(item => item.id === effectiveActive);
  function changePreviewProfile(value: string | null) {
    if (!value || !previewProfiles.some(item => item.value === value)) return;
    setPreviewProfile(value);
    if (value === 'employee') {
      setVisited(items => items.filter(id => id !== 'operations'));
      if (active === 'operations') setActive('knowledge');
    }
  }
  function updateCase(next: FinanceCase) {
    setCases((items) =>
      items.map((item) => (item.id === next.id ? next : item)),
    );
  }
  function navigate(id: string) {
    if (!visibleCatalog.some(item => item.id === id)) return;
    setActive(id);
    setVisited((items) => (items.includes(id) ? items : [...items, id]));
    setOpenMobile(false);
    window.scrollTo({ top: 0 });
  }
  function openAssistant(item: AssistantDefinition) {
    if (item.status !== 'preview') return;
    if (item.entry.kind === 'link') {
      const url = safeAssistantUrl(item.entry.url);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } else navigate(item.id);
  }
  return (
    <>
      <Sidebar className="workbench-sidebar">
        <SidebarHeader className="px-5 py-7">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => navigate(visibleCatalog[0].id)}
            aria-label="打开默认页面"
          >
            <span className="brand-mark">
              <PanelsTopLeft size={23} />
            </span>
            <span>
              <strong className="block text-base">梵行工作台</strong>
              <span className="text-xs text-muted-foreground">
                FANXING WORKSPACE
              </span>
            </span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarMenu>
              {visibleCatalog.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className="h-11 text-sm"
                      isActive={effectiveActive === item.id}
                      disabled={item.status === 'planned'}
                      onClick={() => openAssistant(item)}
                    >
                      <Icon />
                      <span>{item.name}</span>
                      {(item.audience === 'finance' || item.id === 'operations') && (
                        <LockKeyhole className="ml-auto size-3.5 text-muted-foreground" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-5">
          {previewEnabled && <div className="workspace-preview-identity">
            <label id="preview-identity-label">演示身份</label>
            <Select value={previewProfile} onValueChange={changePreviewProfile}>
              <SelectTrigger aria-labelledby="preview-identity-label" className="w-full">
                <SelectValue>{previewProfiles.find(item => item.value === previewProfile)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>{previewProfiles.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p>仅用于本地预览</p>
          </div>}
          <button
            className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={16} />
            关于这个工作台
          </button>
          <div className="mt-3 flex items-center gap-3 border-t pt-5">
            <span className="preview-avatar">预</span>
            <div>
              <p className="text-sm font-medium">预览工作区</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                尚未连接飞书身份
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="workspace-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger aria-label="展开或收起导航" />
            <span className="text-sm text-muted-foreground">工作台</span>
            {current && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="truncate text-sm">{current.name}</span>
              </>
            )}
          </div>
          <span className="preview-badge">本地演示</span>
        </header>
        {visibleCatalog
          .filter(
            (item) =>
              item.entry.kind === 'builtin' && (visited.includes(item.id) || effectiveActive === item.id),
          )
          .map((item) => {
            if (item.entry.kind !== 'builtin') return null;
            const Module = modules[item.entry.module];
            return (
              <div key={item.id === 'operations' ? `${item.id}:${previewProfile}` : item.id} hidden={effectiveActive !== item.id}>
                {Module ? (
                  <Module
                    previewEnabled={previewEnabled}
                    previewProfile={previewProfile}
                    cases={cases}
                    onChange={updateCase}
                    selectedId={effectiveActive === item.id ? selectedId : null}
                    onSelect={setSelectedId}
                  />
                ) : (
                  <Empty className="py-24">
                    <EmptyHeader>
                      <EmptyTitle>{item.name}尚未接入</EmptyTitle>
                      <EmptyDescription>
                        入口已配置，具体能力待连接；没有执行任何业务操作。
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            );
          })}
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>关于梵行工作台</DialogTitle>
              <DialogDescription>
                经营看板、知识问答、报销和财务审核统一进入。拥有经营权限的用户默认进入经营看板，其他用户默认进入知识中心。
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm leading-7">
              当前为本地演示：经营看板使用模拟数据，并演示管理层、OP 负责人及无权限三类访问范围；知识中心仅提供问答界面，问题只保留在当前页面，尚未发送至知识库。企业登录与真实业务数据尚未接入。
            </p>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}
