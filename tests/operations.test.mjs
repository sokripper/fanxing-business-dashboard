import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizeOperations, demoOperations, isLocalOperationsPreview, operationsScope, previewPrincipal } from '../lib/operations-domain.ts';
const query = { start:'2026-09', end:'2026-09', op:'all' };
const management = { userId:'manager', role:'management' };
const opLead = { userId:'lead', role:'op-lead', op:'人力' };

test('anonymous, ordinary employees and incomplete OP assignments fail closed', () => {
  assert.equal(authorizeOperations(null,query).status,401);
  for (const principal of [{userId:'x',role:'employee'},{userId:'x',role:'op-lead'},{userId:'',role:'management'},{userId:'x',role:'admin'},{userId:'x',role:'op-lead',op:'unknown'}]) {
    assert.equal(operationsScope(principal),null);
    assert.equal(authorizeOperations(principal,query).status,403);
    assert.throws(()=>demoOperations(principal,query));
  }
});
test('OP lead cannot request all-company or another OP, including detail payloads', () => {
  for (const op of ['all','汽车','数字员工']) assert.equal(authorizeOperations(opLead,{...query,op}).status,403);
  const data=demoOperations(opLead,{...query,op:'人力'});
  assert.deepEqual(data.availableOps,['人力']);
  assert.equal(data.sales.signed,94);
  assert.equal(data.projects.length,1);
  for (const key of ['汽车','数字员工','车企数据平台','员工 B','员工 C']) assert.equal(JSON.stringify(data).includes(key),false);
});
test('company aggregates equal the sum of separately authorized OP scopes', () => {
  const all=demoOperations(management,query);
  const scoped=['人力','汽车','数字员工'].map(op=>demoOperations({userId:op,role:'op-lead',op},{...query,op}));
  assert.equal(all.sales.signed,331);
  assert.equal(all.sales.net,150);
  assert.equal(all.pending,1);
  assert.equal(all.revenue.expected,176);
  assert.equal(all.revenue.actual,146);
  for (const key of ['signed','net','invoice','cash','pool']) assert.equal(all.sales[key],scoped.reduce((sum,d)=>sum+d.sales[key],0));
  assert.ok(Math.abs(all.costTotal-scoped.reduce((sum,d)=>sum+d.costTotal,0))<1e-8);
  assert.equal(all.idle.days,scoped.reduce((sum,d)=>sum+d.idle.days,0));
});
test('multi-month expense totals do not duplicate budgets and pools ignore month filters', () => {
  const one=demoOperations(opLead,{...query,op:'人力'});
  const many=demoOperations(opLead,{...query,start:'2026-01',op:'人力'});
  assert.equal(one.projects[0].expense,many.projects[0].expense);
  assert.equal(one.projects[0].expenseBudget,many.projects[0].expenseBudget);
  assert.equal(one.sales.pool,many.sales.pool);
  assert.equal(authorizeOperations(management,{...query,start:'2026-10'}).status,400);
  assert.equal(authorizeOperations(management,{...query,end:'2026-08'}).status,400);
  assert.equal(authorizeOperations(management,{...query,op:'unknown'}).status,400);
});
test('preview identity is unavailable on production and non-loopback development hosts', () => {
  for (const environment of ['production','test',undefined]) assert.equal(isLocalOperationsPreview(new URL('http://localhost:3000'),environment),false);
  assert.equal(isLocalOperationsPreview(new URL('https://example.com'),'development'),false);
  assert.equal(isLocalOperationsPreview(new URL('http://localhost:3000'),'development'),true);
  assert.equal(previewPrincipal('admin'),null);
});
