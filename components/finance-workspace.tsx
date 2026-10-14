'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Inbox,
  Printer,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  canConfirmPrint,
  caseMatches,
  confirmDemoPrint,
  currency,
  humanLabels,
  recommendationLabels,
  recordHumanReview,
  type FinanceCase,
} from '@/lib/finance-preview';

export type FinanceWorkspaceProps = {
  cases: FinanceCase[];
  onChange: (item: FinanceCase) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function ResultTag({ item }: { item: FinanceCase }) {
  return (
    <span className={`result-tag result-${item.recommendation}`}>
      {recommendationLabels[item.recommendation]}
    </span>
  );
}

export default function FinanceWorkspace({
  cases,
  onChange,
  selectedId,
  onSelect,
}: FinanceWorkspaceProps) {
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const pending = cases.filter((item) => item.review.status === 'unreviewed');
  const ready = cases.filter(canConfirmPrint);
  const confirmed = cases.filter((item) => item.print.status === 'confirmed');
  const filtered = cases.filter(
    (item) =>
      caseMatches(item, query) &&
      (filter === 'all' ||
        (filter === 'pending' && item.review.status === 'unreviewed') ||
        (filter === 'ready' && canConfirmPrint(item)) ||
        (filter === 'confirmed' && item.print.status === 'confirmed')),
  );
  const selected = cases.find((item) => item.id === selectedId);
  return (
    <div className="workspace-content finance-workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">财务专属 · 示例数据</p>
          <h1>把问题看清楚，再确认</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            核查建议不代替审批；所有打印都需要你确认。
          </p>
        </div>
      </div>
      <div className="finance-summary">
        {[
          {
            key: 'pending',
            label: '待人工复核',
            count: pending.length,
            Icon: ClipboardCheck,
          },
          {
            key: 'ready',
            label: '待确认打印',
            count: ready.length,
            Icon: Printer,
          },
          {
            key: 'confirmed',
            label: '已确认 · 未发送',
            count: confirmed.length,
            Icon: CheckCircle2,
          },
        ].map(({ key, label, count, Icon }) => (
          <button
            key={key}
            className={filter === key ? 'summary-active' : ''}
            onClick={() => setFilter(key)}
          >
            <span>
              <Icon size={18} />
              {label}
            </span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>
      <section className="finance-list">
        <div className="finance-list-tools">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(String(value))}
          >
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="pending">待复核</TabsTrigger>
              <TabsTrigger value="ready">待打印</TabsTrigger>
              <TabsTrigger value="confirmed">已确认</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="搜索报销单"
              className="h-10 pl-9"
              placeholder="搜索申请人或报销内容"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {filtered.length ? (
          <Table className="finance-table">
            <TableHeader>
              <TableRow>
                <TableHead>报销单</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>核查建议</TableHead>
                <TableHead>需要关注</TableHead>
                <TableHead>
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <button
                      className="case-title"
                      onClick={() => onSelect(item.id)}
                    >
                      <strong>
                        {item.applicant} · {item.description}
                      </strong>
                      <span>
                        {item.department} · {item.id}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {currency(item.amountCents)}
                  </TableCell>
                  <TableCell>
                    <ResultTag item={item} />
                  </TableCell>
                  <TableCell className="!whitespace-normal">
                    <p className="max-w-sm leading-6">{item.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {humanLabels[item.review.status]}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      aria-label={`查看${item.applicant}的报销单`}
                      onClick={() => onSelect(item.id)}
                    >
                      查看
                      <ChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>
                {query ? '没有匹配的报销单' : '这个列表暂时没有单据'}
              </EmptyTitle>
              <EmptyDescription>
                {query
                  ? '换一个姓名或关键词试试。'
                  : filter === 'ready'
                    ? '完成复核并选择“可打印”后，会出现在这里。'
                    : '可以切换到“全部”查看示例单据。'}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              查看全部
            </Button>
          </Empty>
        )}
      </section>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        以上为虚构单据，用于体验界面；没有连接真实审批、模型、查验、台账或打印服务。演示操作刷新后重置。
      </p>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) onSelect(null);
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:!max-w-[660px]">
          {selected && (
            <CaseDetail key={selected.id} item={selected} onChange={onChange} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CaseDetail({
  item,
  onChange,
}: {
  item: FinanceCase;
  onChange: (item: FinanceCase) => void;
}) {
  const [note, setNote] = useState(item.review.note);
  const [printDialog, setPrintDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  function saveReview(status: 'print_ready' | 'hold') {
    const next = recordHumanReview(item, status, note);
    if (next === item) {
      setFeedback('请填写问题核实情况或暂不打印的原因。');
      return;
    }
    onChange(next);
    setFeedback('已保存演示复核记录，未提交任何飞书审批。');
  }
  return (
    <>
      <SheetHeader className="border-b px-6 py-6 pr-14">
        <SheetDescription>{item.id} · 示例单据</SheetDescription>
        <SheetTitle className="mt-1 text-xl">
          {item.applicant}的报销单
        </SheetTitle>
      </SheetHeader>
      <div className="space-y-7 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">{item.description}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.department} · {item.invoiceCount} 张发票
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {currency(item.amountCents)}
          </p>
        </div>
        <dl className="case-facts">
          <div>
            <dt>费用归属</dt>
            <dd>
              {item.expenseType}
              {item.project ? ` · ${item.project}` : ''}
            </dd>
          </div>
          <div>
            <dt>付款公司</dt>
            <dd>{item.company}</dd>
          </div>
          <div>
            <dt>发票合计</dt>
            <dd>
              {currency(item.invoiceTotalCents)}
              {item.amountCents < item.invoiceTotalCents && (
                <span className="ml-2 text-xs text-muted-foreground">
                  仅报销部分金额，允许
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>飞书审批</dt>
            <dd>待审批（示例，未同步）</dd>
          </div>
        </dl>
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-semibold">核查结论</h3>
            <ResultTag item={item} />
          </div>
          {item.issues.length ? (
            <div className="space-y-3">
              {item.issues.map((issue) => (
                <div
                  key={issue.title}
                  className={`issue-panel ${item.recommendation === 'fail' ? 'issue-error' : ''}`}
                >
                  <div className="flex gap-2">
                    <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                    <h4 className="font-medium">{issue.title}</h4>
                  </div>
                  <p>{issue.detail}</p>
                  <p>
                    <strong>建议处理：</strong>
                    {issue.next}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="pass-panel">
              <ShieldCheck size={19} />
              <div>
                <p>本次核查未发现需要补正的问题。</p>
                <p className="mt-1 text-sm">
                  仍需人工复核，不会自动审批或打印。
                </p>
              </div>
            </div>
          )}
        </section>
        <section className="border-t pt-6">
          <h3 className="font-semibold">你的复核</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            只记录复核与打印安排，不改变飞书审批结果。
          </p>
          <Label htmlFor="review-note" className="mb-2 mt-4 block">
            复核备注{item.recommendation !== 'pass' ? '（必填）' : '（选填）'}
          </Label>
          <Textarea
            id="review-note"
            placeholder={
              item.recommendation === 'pass'
                ? '有补充说明时再填'
                : '说明问题如何核实、已更正什么或暂不打印的原因'
            }
            className="min-h-24"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setFeedback('');
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => saveReview('print_ready')} className="h-10">
              已复核，可打印
            </Button>
            <Button
              variant="outline"
              onClick={() => saveReview('hold')}
              className="h-10"
            >
              暂不打印
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            当前：{humanLabels[item.review.status]}
          </p>
          {feedback && (
            <p role="status" className="mt-2 text-sm text-primary">
              {feedback}
            </p>
          )}
        </section>
        <section className="rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <Printer size={18} />
            <h3 className="font-semibold">打印归档</h3>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            计划包含：报销单、发票与附件、核查记录。实际文件生成和打印服务尚未接入。
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm">
              {item.print.status === 'confirmed'
                ? '已确认 · 未发送打印'
                : item.review.status === 'hold'
                  ? '暂不打印'
                  : canConfirmPrint(item)
                    ? '等待你确认打印'
                    : '请先完成人工复核'}
            </span>
            <Button
              className="h-10"
              variant="outline"
              disabled={!canConfirmPrint(item)}
              onClick={() => setPrintDialog(true)}
            >
              <Printer />
              确认打印
            </Button>
          </div>
        </section>
        <details className="border-t pt-5">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            处理记录（演示）
          </summary>
          <ol className="mt-4 space-y-3">
            {item.events.map((event, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6">
                <FileText className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <span>{event}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
      <Dialog open={printDialog} onOpenChange={setPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认打印这笔报销？</DialogTitle>
            <DialogDescription>
              {item.applicant} · {item.description} ·{' '}
              {currency(item.amountCents)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-7">
            本次仅演示确认动作，不会发出打印任务，也不会提交或通过飞书审批。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialog(false)}>
              取消
            </Button>
            <Button
              disabled={!canConfirmPrint(item)}
              onClick={() => {
                onChange(confirmDemoPrint(item));
                setPrintDialog(false);
                setFeedback('已确认打印（演示）。尚未连接打印机，没有出纸。');
              }}
            >
              确认（演示）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
