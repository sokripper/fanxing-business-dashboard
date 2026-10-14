'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  MoreHorizontal,
  ReceiptText,
  Save,
  UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  applySuggestions,
  automaticDescription,
  changeExpenseType,
  companies,
  expenseTypes,
  isHotel,
  money,
  projects,
  reimbursementTypes,
  samples,
  scenarioLabels,
  submissionFields,
  suggestions,
  review,
  validate,
  withTotal,
  type Form,
  type Invoice,
  type Scenario,
} from '@/lib/expense';

const draftKey = 'fanxing-expense-prototype-v2';
const initialForm = () => suggestions(samples.software, '', '');
const accounts = ['本人常用账户（尾号 4832）', '本人备用账户（尾号 0917）'];
type Editor =
  | 'company'
  | 'description'
  | 'type'
  | 'org'
  | 'account'
  | 'amount'
  | 'hotel'
  | null;
const editorTitles = {
  company: '付款公司',
  description: '报销内容',
  type: '报销分类',
  org: '所属组织',
  account: '收款账户',
  amount: '金额明细',
  hotel: '住宿明细',
};

export default function ExpenseAssistant() {
  const [step, setStep] = useState(0);
  const [invoice, setInvoice] = useState<Invoice>(samples.software);
  const [form, setForm] = useState<Form>(initialForm);
  const [edited, setEdited] = useState<(keyof Form)[]>([]);
  const [scenario, setScenario] = useState<Scenario>('pass');
  const [demoConfirmedDays, setDemoConfirmedDays] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState<ReturnType<
    typeof submissionFields
  > | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const evidence = {
    confirmedWorkDays:
      invoice.source === 'sample' && demoConfirmedDays !== ''
        ? demoConfirmedDays
        : undefined,
  };
  const result = review(form, invoice, scenario, evidence);
  const errors = result.issues.filter((issue) => issue.level === 'error');
  const warnings = result.issues.filter((issue) => issue.level === 'warning');
  const ownershipReady =
    expenseTypes.includes(form.expenseType) &&
    (form.expenseType !== '项目费用' || Object.hasOwn(projects, form.project));

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null');
      if (!saved?.form || !saved?.invoice) return;
      if (
        !['fileName', 'size', 'buyer', 'item', 'gross'].every(
          (key) => typeof saved.invoice[key] === 'string',
        ) ||
        !['sample', 'manual'].includes(saved.invoice.source)
      )
        return;
      if (
        !['issuedAt', 'hotelCity', 'nightlyAmounts'].every(
          (key) =>
            saved.invoice[key] === undefined ||
            typeof saved.invoice[key] === 'string',
        )
      )
        return;
      const known =
        saved.invoice.source === 'sample'
          ? Object.values(samples).find(
              (item) => item.fileName === saved.invoice.fileName,
            )
          : undefined;
      const restoredInvoice: Invoice = {
        issuedAt: '',
        hotelCity: '',
        nightlyAmounts: '',
        ...known,
        ...saved.invoice,
      };
      const restored = initialForm();
      for (const key of Object.keys(restored) as (keyof Form)[])
        if (typeof saved.form[key] === 'string')
          restored[key] = saved.form[key];
      const oldAmount = saved.form.invoiceAmount ?? saved.form.amount;
      if (typeof oldAmount === 'string') restored.invoiceAmount = oldAmount;
      restored.expenseType = expenseTypes.includes(restored.expenseType)
        ? restored.expenseType
        : '';
      const oldProject = saved.form.project ?? saved.project;
      restored.project =
        restored.expenseType === '项目费用' &&
        typeof oldProject === 'string' &&
        Object.hasOwn(projects, oldProject)
          ? oldProject
          : '';
      const edits: (keyof Form)[] = Array.isArray(saved.edited)
        ? saved.edited
            .map((key: string) => (key === 'amount' ? 'invoiceAmount' : key))
            .filter((key: string) => Object.hasOwn(restored, key))
        : [];
      if (!edits.includes('description'))
        restored.description = automaticDescription(
          restoredInvoice,
          restored.project,
          restored.expenseType,
        );
      setInvoice(restoredInvoice);
      setForm(withTotal(restored));
      setEdited(edits);
      setDraftMessage('已恢复本页草稿');
    } catch {
      /* A local draft is optional. */
    }
  }, []);

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: object,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'set_expense_validation_scenario',
          title: '切换报销演示结果',
          description:
            '切换原型预检示例，与演示设置使用同一状态。只对示例票据生效，不调用真实服务。',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: { type: 'string', enum: Object.keys(scenarioLabels) },
            },
            required: ['scenario'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: { scenario: Scenario }) {
            if (!Object.hasOwn(scenarioLabels, input.scenario))
              throw new Error('不支持的场景');
            setScenario(input.scenario);
            return {
              scenario: input.scenario,
              submissionAllowed: !validate(
                form,
                invoice,
                input.scenario,
                evidence,
              ).some((issue) => issue.level === 'error'),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [form, invoice, demoConfirmedDays]);

  function edit(key: keyof Form, value: string) {
    setForm((current) =>
      withTotal({
        ...current,
        [key]: value,
        ...(key === 'project' && !edited.includes('description')
          ? {
              description: automaticDescription(
                invoice,
                value,
                current.expenseType,
              ),
            }
          : {}),
      }),
    );
    setEdited((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setDraftMessage('');
  }
  function selectExpenseType(value: string) {
    setForm((current) => changeExpenseType(current, invoice, value, edited));
    setEdited((current) =>
      current.includes('expenseType') ? current : [...current, 'expenseType'],
    );
    setDraftMessage('');
  }
  function replaceInvoice(next: Invoice) {
    setInvoice(next);
    setForm((current) =>
      applySuggestions(
        current,
        suggestions(next, current.project, current.expenseType),
        edited,
      ),
    );
    setScenario('pass');
    setDemoConfirmedDays('');
    setDraftMessage('');
    setFileError('');
  }
  function upload(file?: File) {
    if (!file) return;
    if (
      !/\.(pdf|png|jpe?g)$/i.test(file.name) ||
      file.size > 50 * 1024 * 1024
    ) {
      setFileError('请选择 50 MB 以内的 PDF、JPG 或 PNG 文件。');
      return;
    }
    replaceInvoice({
      fileName: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      buyer: '',
      item: '',
      gross: '',
      source: 'manual',
      issuedAt: '',
      hotelCity: '',
      nightlyAmounts: '',
    });
  }
  function saveDraft() {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ invoice, form, edited }),
      );
      setDraftMessage('已暂存本页');
    } catch {
      setDraftMessage('暂存失败，请保持页面打开');
    }
  }
  function goStep(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function resolveIssue(key: string) {
    if (['expense-type', 'project', 'date', 'history'].includes(key))
      return goStep(0);
    if (['buyer', 'company'].includes(key)) setEditor('company');
    else if (['org', 'subDepartment'].includes(key)) setEditor('org');
    else if (['amount', 'total', 'invoice-value', 'allowance'].includes(key))
      setEditor('amount');
    else if (['account', 'description', 'type', 'hotel'].includes(key))
      setEditor(key as Editor);
  }
  function submitDemo() {
    if (
      validate(form, invoice, scenario, evidence).some(
        (issue) => issue.level === 'error',
      )
    ) {
      setDialogOpen(false);
      return;
    }
    setSubmitted(submissionFields(form));
    setDialogOpen(false);
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* Local state only. */
    }
  }

  return (
    <div className="bg-background text-foreground">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white">
              <ReceiptText className="size-4" />
            </span>
            <span className="truncate font-semibold">梵行报销助手</span>
            <Badge variant="secondary" className="text-[10px] font-normal">
              原型
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!submitted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={saveDraft}
                aria-label="暂存本页"
              >
                <Save className="size-4" />
                <span className="hidden sm:inline">
                  {draftMessage || '暂存本页'}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="演示设置"
              onClick={() => setDemoOpen(true)}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </div>
        </div>
      </header>
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        aria-label="选择发票文件"
        onChange={(event) => {
          upload(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="mx-auto max-w-[760px] px-4 py-7 sm:px-8 sm:py-10">
        {submitted ? (
          <Card className="shadow-none">
            <CardContent className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto mb-5 size-12 text-emerald-600" />
              <h1 className="text-2xl font-semibold">已完成提交演示</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                本次未上传材料，也未创建真实飞书审批。
              </p>
              <div className="my-7 rounded-xl bg-muted px-5 text-left">
                <ReviewRow
                  label="费用归属"
                  value={`${submitted.expenseType}${'project' in submitted ? ` · ${submitted.project}` : ''}`}
                />
                <ReviewRow label="报销内容" value={submitted.description} />
                <ReviewRow
                  label="报销金额"
                  value={`¥${money(submitted.amount)}`}
                />
                <ReviewRow label="付款公司" value={submitted.company} />
                <ReviewRow label="收款账户" value={submitted.account} />
              </div>
              <Button
                onClick={() => {
                  setSubmitted(null);
                  goStep(0);
                }}
              >
                再体验一笔
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>顾凯的费用报销 · 示例身份</span>
                <span>{step + 1} / 2</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
                {step === 0 ? '先放入发票' : '核对一下，就可以提交'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === 0
                  ? '选择费用归属，其余信息辅助带入。'
                  : '已带出的信息不用重填；有变化再修改。'}
              </p>
            </div>

            {step === 0 ? (
              <Card className="shadow-none">
                <CardContent className="space-y-6 p-5 sm:p-7">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex w-full items-center gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/[.035] px-4 py-5 text-left transition hover:bg-primary/[.07]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white text-primary">
                      <UploadCloud className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        上传发票
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        PDF、JPG、PNG · 每张不超过 50 MB
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-primary" />
                  </button>
                  <div>
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">
                          {invoice.fileName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {invoice.source === 'sample'
                            ? '示例发票，非真实识别结果'
                            : '仅本地选择，尚未上传飞书'}{' '}
                          · {invoice.size}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInput.current?.click()}
                      >
                        更换
                      </Button>
                    </div>
                    {fileError && (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        {fileError}
                      </p>
                    )}
                    <Fold
                      key={invoice.fileName}
                      title={
                        invoice.source === 'manual'
                          ? '补充票面信息'
                          : '查看票面'
                      }
                      defaultOpen={invoice.source === 'manual'}
                    >
                      <div className="grid gap-4 pt-3 sm:grid-cols-2">
                        <Field label="发票抬头">
                          <Input
                            value={invoice.buyer}
                            onChange={(e) =>
                              replaceInvoice({
                                ...invoice,
                                buyer: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="票面内容">
                          <Input
                            value={invoice.item}
                            onChange={(e) =>
                              replaceInvoice({
                                ...invoice,
                                item: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="价税合计">
                          <Input
                            inputMode="decimal"
                            value={invoice.gross}
                            onChange={(e) =>
                              replaceInvoice({
                                ...invoice,
                                gross: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="开票日期">
                          <Input
                            type="date"
                            value={invoice.issuedAt}
                            onChange={(e) =>
                              replaceInvoice({
                                ...invoice,
                                issuedAt: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </Fold>
                  </div>
                  <div className="border-t pt-6">
                    <Label className="mb-3 block text-sm">
                      这笔费用属于哪里？
                    </Label>
                    <RadioGroup
                      value={form.expenseType}
                      onValueChange={(value) =>
                        selectExpenseType(String(value))
                      }
                      className="grid grid-cols-3 gap-2"
                    >
                      {expenseTypes.map((type) => (
                        <label
                          key={type}
                          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm transition ${form.expenseType === type ? 'border-primary bg-primary/5 text-primary' : 'bg-white hover:bg-muted'}`}
                        >
                          <RadioGroupItem value={type} aria-label={type} />
                          <span>{type}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    {form.expenseType === '项目费用' && (
                      <div className="mt-5">
                        <Field label="所属项目">
                          <Choice
                            value={form.project}
                            values={Object.keys(projects)}
                            placeholder="选择这笔费用对应的项目"
                            onChange={(value) => edit('project', value)}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                  <Button
                    className="h-11 w-full"
                    disabled={!ownershipReady}
                    onClick={() => goStep(1)}
                  >
                    查看报销信息
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="shadow-none">
                  <CardContent className="p-5 sm:p-7">
                    <div className="mb-6 flex items-center gap-2 border-b pb-4">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {invoice.fileName}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goStep(0)}
                      >
                        更换
                      </Button>
                    </div>
                    <div className="mb-6">
                      <div className="mb-2 flex items-center justify-between">
                        <Label htmlFor="claim-amount">
                          {form.allowanceAmount !== ''
                            ? '票据报销金额'
                            : '报销金额'}
                        </Label>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setEditor('amount')}
                        >
                          金额明细
                        </Button>
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                          ¥
                        </span>
                        <Input
                          id="claim-amount"
                          className="h-14 pl-10 text-2xl font-semibold sm:text-2xl"
                          inputMode="decimal"
                          value={form.invoiceAmount}
                          onChange={(e) =>
                            edit('invoiceAmount', e.target.value)
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        票面 ¥{money(invoice.gross)}，可只报销其中一部分。
                        {form.allowanceAmount !== '' &&
                          `另含津贴 ¥${money(form.allowanceAmount)}，合计 ¥${money(form.amount)}。`}
                      </p>
                    </div>
                    <div>
                      <ReviewRow
                        label="报销内容"
                        value={form.description}
                        missing={!form.description.trim()}
                        onEdit={() => setEditor('description')}
                      />
                      <ReviewRow
                        label="费用归属"
                        value={`${form.expenseType}${form.expenseType === '项目费用' && form.project ? ` · ${form.project}` : ''}`}
                        missing={!ownershipReady}
                        onEdit={() => goStep(0)}
                      />
                      <ReviewRow
                        label="付款公司"
                        value={form.company}
                        missing={!companies.includes(form.company)}
                        onEdit={() => setEditor('company')}
                      />
                      <ReviewRow
                        label="报销分类"
                        value={form.reimbursementType}
                        missing={
                          !reimbursementTypes.includes(form.reimbursementType)
                        }
                        onEdit={() => setEditor('type')}
                      />
                      <ReviewRow
                        label="所属组织"
                        value={[form.org, form.subDepartment]
                          .filter(Boolean)
                          .join(' / ')}
                        note="示例组织"
                        missing={!form.org.trim() || !form.subDepartment.trim()}
                        onEdit={() => setEditor('org')}
                      />
                      <ReviewRow
                        label="收款账户"
                        value={form.account}
                        note="示例账户"
                        missing={!form.account.trim()}
                        onEdit={() => setEditor('account')}
                      />
                    </div>
                  </CardContent>
                </Card>
                {result.issues.length > 0 && (
                  <div className="mt-4 space-y-3" role="status">
                    {result.issues.map((issue) => (
                      <div
                        key={issue.key}
                        className={`rounded-xl border px-4 py-3 ${issue.level === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium">{issue.title}</p>
                          {issue.level === 'error' && (
                            <button
                              className="shrink-0 text-xs underline underline-offset-4"
                              onClick={() => resolveIssue(issue.key)}
                            >
                              去处理
                            </button>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-5 opacity-80">
                          {issue.detail}
                        </p>
                        {issue.key === 'hotel' && (
                          <button
                            className="mt-2 text-xs underline underline-offset-4"
                            onClick={() => setEditor('hotel')}
                          >
                            补充住宿明细
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 px-1">
                  <Fold title="查看核对详情">
                    <dl className="space-y-3 pb-2 pt-3">
                      {result.checks.map((check) => (
                        <div
                          key={check.key}
                          className="grid grid-cols-[76px_1fr] gap-3 text-xs leading-5"
                        >
                          <dt className="text-muted-foreground">
                            {check.label}
                          </dt>
                          <dd>{check.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Fold>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => goStep(0)}
                  >
                    <ArrowLeft className="size-4" />
                    上一步
                  </Button>
                  <Button
                    className="h-11"
                    disabled={errors.length > 0}
                    onClick={() => setDialogOpen(true)}
                  >
                    {warnings.length ? '确认并提交复核' : '确认并提交'}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </>
            )}
            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              交互原型 · 未连接真实飞书审批、组织和历史账户
            </p>
            {draftMessage && (
              <p
                role="status"
                className="mt-2 text-center text-xs text-primary sm:hidden"
              >
                {draftMessage}
              </p>
            )}
          </>
        )}
      </div>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor ? editorTitles[editor] : ''}</DialogTitle>
            <DialogDescription>只需修改有变化的内容。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editor === 'company' && (
              <>
                <Choice
                  value={form.company}
                  values={companies}
                  placeholder="选择付款公司"
                  onChange={(value) => edit('company', value)}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  发票抬头：{invoice.buyer || '尚未读取'}
                  。须与本单付款公司一致。
                </p>
              </>
            )}
            {editor === 'description' && (
              <Textarea
                aria-label="报销内容"
                className="min-h-24"
                value={form.description}
                onChange={(e) => edit('description', e.target.value)}
              />
            )}
            {editor === 'type' && (
              <Choice
                value={form.reimbursementType}
                values={reimbursementTypes}
                placeholder="选择报销分类"
                onChange={(value) => edit('reimbursementType', value)}
              />
            )}
            {editor === 'org' && (
              <>
                <Field label="组织结构">
                  <Input
                    value={form.org}
                    onChange={(e) => edit('org', e.target.value)}
                  />
                </Field>
                <Field label="子部门组织">
                  <Input
                    value={form.subDepartment}
                    onChange={(e) => edit('subDepartment', e.target.value)}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  当前为示例值，尚未读取飞书组织。两项均需填写。
                </p>
              </>
            )}
            {editor === 'account' && (
              <>
                <Choice
                  value={form.account}
                  values={accounts}
                  placeholder="选择收款账户"
                  onChange={(value) => edit('account', value)}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  仅演示账户选择，尚未读取本人历史账户，也未进行银行卡验证。
                </p>
              </>
            )}
            {editor === 'amount' && (
              <>
                <Field label="票据报销金额">
                  <Input
                    inputMode="decimal"
                    value={form.invoiceAmount}
                    onChange={(e) => edit('invoiceAmount', e.target.value)}
                  />
                </Field>
                {form.allowanceAmount === '' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => edit('allowanceAmount', '0')}
                  >
                    另有出差津贴
                  </Button>
                ) : (
                  <div className="space-y-4 rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">出差津贴</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          edit('allowanceAmount', '');
                          edit('declaredDays', '');
                        }}
                      >
                        移除
                      </Button>
                    </div>
                    <Field label="津贴金额">
                      <Input
                        inputMode="decimal"
                        value={form.allowanceAmount}
                        onChange={(e) =>
                          edit('allowanceAmount', e.target.value)
                        }
                      />
                    </Field>
                    <Field label="申报天数">
                      <Input
                        inputMode="decimal"
                        value={form.declaredDays}
                        onChange={(e) => edit('declaredDays', e.target.value)}
                      />
                    </Field>
                    <p className="text-xs leading-5 text-muted-foreground">
                      津贴与票据费用分开，最终按人时确认节点核对。
                    </p>
                  </div>
                )}
                <p className="text-sm font-medium">
                  报销合计：¥{money(form.amount)}
                </p>
              </>
            )}
            {editor === 'hotel' && (
              <>
                <Field label="入住城市">
                  <Input
                    value={invoice.hotelCity}
                    onChange={(e) =>
                      setInvoice((current) => ({
                        ...current,
                        hotelCity: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="每晚房费（用逗号分隔）">
                  <Input
                    value={invoice.nightlyAmounts}
                    onChange={(e) =>
                      setInvoice((current) => ({
                        ...current,
                        nightlyAmounts: e.target.value,
                      }))
                    }
                  />
                </Field>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setEditor(null)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认这笔报销</DialogTitle>
            <DialogDescription>
              费用和收款信息已由本人核对。本次仅演示，不会向飞书发起申请。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted px-4">
            <ReviewRow label="报销金额" value={`¥${money(form.amount)}`} />
            <ReviewRow
              label="费用归属"
              value={`${form.expenseType}${form.expenseType === '项目费用' ? ` · ${form.project}` : ''}`}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            正式接入还需上传原流程要求的图片、附件，并核对控件对应关系；本页选择文件不代表已完成上传。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              再检查一下
            </Button>
            <Button onClick={submitDemo}>
              <Check className="size-4" />
              模拟本人提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>演示设置</DialogTitle>
            <DialogDescription>
              仅供体验流程，不影响任何真实单据。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <Field label="示例发票">
              <div className="flex flex-wrap gap-2">
                {Object.entries(samples).map(([key, sample]) => (
                  <Button
                    key={key}
                    variant={
                      invoice.fileName === sample.fileName
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => replaceInvoice(sample)}
                  >
                    {key === 'software'
                      ? '软件服务'
                      : key === 'hotel'
                        ? '住宿费用'
                        : '硬件采购'}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="预检场景">
              <Choice
                value={scenario}
                values={Object.keys(scenarioLabels)}
                labels={scenarioLabels}
                onChange={(value) => setScenario(value as Scenario)}
              />
            </Field>
            <Field label="模拟人时确认节点：已确认天数">
              <Input
                inputMode="decimal"
                value={demoConfirmedDays}
                onChange={(e) => setDemoConfirmedDays(e.target.value)}
              />
            </Field>
            {isHotel(invoice) && (
              <Button
                variant="outline"
                onClick={() => {
                  setDemoOpen(false);
                  setEditor('hotel');
                }}
              >
                调整住宿明细
              </Button>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              真实税务验真、组织、历史账户及审批均未接入。示例不作为审核证据。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setDemoOpen(false)}>返回报销</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Choice({
  value,
  values,
  onChange,
  placeholder = '请选择',
  labels,
}: {
  value: string;
  values: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  labels?: Record<string, string>;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(String(next));
      }}
    >
      <SelectTrigger className="w-full data-[size=default]:h-11">
        <SelectValue placeholder={placeholder}>
          {value ? (labels?.[value] ?? value) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {labels?.[item] ?? item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Fold({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="mt-3">
      <CollapsibleTrigger className="group flex w-full items-center justify-between py-2 text-xs text-muted-foreground">
        <span>{title}</span>
        <ChevronDown className="size-3.5 transition group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
function ReviewRow({
  label,
  value,
  onEdit,
  missing = false,
  note,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  missing?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b py-3.5 last:border-0">
      <span className="w-16 shrink-0 pt-0.5 text-sm text-muted-foreground sm:w-20">
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-sm leading-6 ${missing ? 'text-destructive' : ''}`}
        >
          {value || '待补充'}
          {missing && value ? ' · 待补齐' : ''}
        </p>
        {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className={`shrink-0 py-1 text-xs ${missing ? 'text-destructive' : 'text-primary'}`}
        >
          {missing ? '补充' : '修改'}
        </button>
      )}
    </div>
  );
}
