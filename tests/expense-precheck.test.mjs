import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applySuggestions, beijingDate, companies, earliestInvoiceDate, changeExpenseType, submissionFields,
  expectedAllowance, review, samples, suggestions, validate, withTotal,
} from '../lib/expense.ts';

const project = 'AI政务数字员工知识库';
const invoice = { ...samples.software, issuedAt: '2026-09-01', gross: '1000.00' };
const base = suggestions(invoice, project);
const evidence = { submittedAt: '2026-09-14' };
const issues = (form = base, inv = invoice, scenario = 'pass', extra = {}) => validate(form, inv, scenario, { ...evidence, ...extra });
const has = (list, key, level) => list.some((item) => item.key === key && (!level || item.level === level));

test('natural-month date range includes both boundaries and clamps month ends', () => {
  assert.equal(earliestInvoiceDate('2026-08-31'), '2026-02-28');
  assert.equal(earliestInvoiceDate('2024-08-31'), '2024-02-29');
  for (const issuedAt of ['2026-03-14', '2026-09-14']) assert.equal(has(issues(base, { ...invoice, issuedAt }), 'date'), false);
  for (const issuedAt of ['2026-03-13', '2026-09-15']) assert.equal(has(issues(base, { ...invoice, issuedAt }), 'date', 'error'), true);
  for (const issuedAt of ['', '2026-02-30']) assert.equal(has(issues(base, { ...invoice, issuedAt }), 'date', 'warning'), true);
  assert.equal(beijingDate(new Date('2026-09-13T16:01:00Z')), '2026-09-14');
});

test('latest submission date is reevaluated', () => {
  const dated = { ...invoice, issuedAt: '2026-03-14' };
  assert.equal(has(issues(base, dated), 'date'), false);
  assert.equal(has(issues(base, dated, 'pass', { submittedAt: '2026-09-15' }), 'date', 'error'), true);
});

test('buyer must match this claim company, not any allowed company', () => {
  assert.equal(has(issues({ ...base, company: companies[1] }), 'buyer', 'error'), true);
  assert.equal(has(issues(base, { ...invoice, buyer: '' }), 'buyer', 'warning'), true);
});

test('partial reimbursement allowed; invoiced overclaim blocked to the cent', () => {
  assert.deepEqual(issues(withTotal({ ...base, invoiceAmount: '999.99' })), []);
  assert.equal(has(issues(withTotal({ ...base, invoiceAmount: '1000.01' })), 'invoice-value', 'error'), true);
});

test('allowance is separate from invoice value, total must match all lines', () => {
  const form = withTotal({ ...base, invoiceAmount: '900', allowanceAmount: '800' });
  assert.equal(form.amount, '1700.00');
  assert.deepEqual(issues(form, invoice, 'pass', { confirmedWorkDays: '8' }), []);
  assert.equal(has(issues({ ...form, amount: '1699' }), 'total', 'error'), true);
});

test('7, 7.5 and 8 confirmed days use one rate for the same trip', () => {
  for (const [days, expected] of [['7', 49000], ['7.5', 75000], ['8', 80000]]) {
    assert.equal(expectedAllowance(days)?.cents, expected);
  }
  assert.equal(expectedAllowance('4').cents * 2, 56000);
  for (const days of ['', '-1', '7.2', '8e1']) assert.equal(expectedAllowance(days), null);
});

test('declared days cannot stand in for confirmed work-time', () => {
  const form = withTotal({ ...base, declaredDays: '8', allowanceAmount: '800' });
  assert.equal(has(issues(form), 'allowance', 'warning'), true);
  assert.equal(has(issues(form, invoice, 'pass', { confirmedWorkDays: '7' }), 'allowance', 'warning'), true);
  const invalid = review({ ...form, allowanceAmount: 'abc' }, invoice, 'pass', { ...evidence, confirmedWorkDays: '8' });
  assert.equal(invalid.checks.find((c) => c.key === 'allowance').value, '金额格式有误，尚不能核对');
});

test('suspected duplicates go to review; confirmed full consumption blocks', () => {
  assert.equal(has(issues(base, invoice, 'suspected'), 'history', 'warning'), true);
  assert.equal(has(issues(base, invoice, 'duplicate'), 'history', 'error'), true);
});

test('real upload never inherits demo verification or duplicate evidence', () => {
  const real = { ...invoice, source: 'manual' };
  for (const scenario of ['pass', 'degraded', 'expired', 'duplicate']) {
    const result = review(base, real, scenario, evidence);
    assert.equal(has(result.issues, 'verification', 'warning'), true);
    assert.equal(result.issues.some((i) => i.level === 'error'), false);
    assert.match(result.checks.find((c) => c.key === 'history').value, /未接入/);
    assert.equal(result.checks.some((c) => c.value.includes('查验一致')), false);
  }
});

test('tax service failures are reviewable, not business rejections', () => {
  const result = issues(base, invoice, 'degraded');
  assert.equal(has(result, 'verification', 'warning'), true);
  assert.equal(result.some((i) => i.level === 'error'), false);
});

test('hotel nights checked individually; over-limit and unknown tier are reviewable', () => {
  const hotel = { ...samples.hotel, gross: '600', nightlyAmounts: '400, 200' };
  const form = suggestions(hotel, project);
  assert.equal(has(issues(form, hotel), 'hotel', 'warning'), true);
  assert.equal(has(issues(form, { ...hotel, nightlyAmounts: '300, 300' }), 'hotel'), false);
  assert.equal(has(issues(form, { ...hotel, nightlyAmounts: '200, 200' }), 'hotel', 'warning'), true);
  assert.equal(has(issues(form, { ...hotel, hotelCity: '武汉' }), 'hotel', 'warning'), true);
});

test('prefill never overwrites user edits and always rederives total', () => {
  const current = withTotal({ ...base, invoiceAmount: '900', allowanceAmount: '800', description: '手动用途' });
  const next = applySuggestions(current, suggestions(samples.hardware, project), ['invoiceAmount', 'allowanceAmount', 'description']);
  assert.equal(next.invoiceAmount, '900');
  assert.equal(next.description, '手动用途');
  assert.equal(next.amount, '1700.00');
  assert.equal(next.company, companies[2]);
});

test('non-project branches clear stale project and optional payload fields', () => {
  for (const expenseType of ['运营费用', '销售费用']) {
    const next = changeExpenseType({ ...base, stage: '旧阶段', iteration: '旧迭代' }, invoice, expenseType, []);
    assert.equal(next.project, '');
    assert.equal(next.description, '软件服务费');
    assert.deepEqual(issues(next), []);
    const payload = submissionFields(next);
    for (const key of ['project', 'stage', 'iteration']) assert.equal(Object.hasOwn(payload, key), false);
  }
});

test('only project expense requires a valid project; changing back requires selection', () => {
  const sales = changeExpenseType(base, invoice, '销售费用', []);
  const next = changeExpenseType(sales, invoice, '项目费用', []);
  assert.equal(has(issues(next), 'project', 'error'), true);
  assert.equal(has(issues({ ...next, project }), 'project'), false);
  assert.equal(has(issues({ ...next, expenseType: '非项目费用' }), 'expense-type', 'error'), true);
});

test('changing ownership preserves handwritten description', () => {
  const next = changeExpenseType({ ...base, description: '我自己的用途说明' }, invoice, '销售费用', ['description']);
  assert.equal(next.description, '我自己的用途说明');
  assert.equal(next.project, '');
});

test('missing required compact-row values cannot be submitted', () => {
  for (const key of ['org', 'subDepartment', 'account']) assert.equal(has(issues({ ...base, [key]: ' ' }), key, 'error'), true);
});

test('new invoice does not restore a project or overwrite selected expense type', () => {
  const sales = changeExpenseType(base, invoice, '销售费用', []);
  const next = applySuggestions(sales, suggestions(samples.hardware, sales.project, sales.expenseType), []);
  assert.equal(next.expenseType, '销售费用');
  assert.equal(next.project, '');
  assert.equal(next.description, '显示器');
  assert.equal(next.company, companies[2]);
});
