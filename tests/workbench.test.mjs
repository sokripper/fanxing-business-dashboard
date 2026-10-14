import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assistantRegistry,
  listAssistants,
  safeAssistantUrl,
} from '../lib/assistant-registry.ts';
import {
  canConfirmPrint,
  caseMatches,
  confirmDemoPrint,
  createDemoCases,
  invalidateMaterialVersion,
  recordHumanReview,
} from '../lib/finance-preview.ts';

test('catalog-driven ordering and visibility accommodate new assistants', () => {
  const extra = { ...assistantRegistry[0], id: 'new-helper', order: 1 };
  assert.equal(
    listAssistants([...assistantRegistry, extra])[0].id,
    'new-helper',
  );
  assert.equal(listAssistants([{ ...extra, enabled: false }]).length, 0);
  assert.equal(
    new Set(assistantRegistry.map((a) => a.id)).size,
    assistantRegistry.length,
  );
});
test('external entries cannot execute scripts or expose inline credentials', () => {
  assert.equal(
    safeAssistantUrl('https://example.com/help'),
    'https://example.com/help',
  );
  for (const url of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:secret@example.com',
    'garbage',
  ])
    assert.equal(safeAssistantUrl(url), null);
});
test('even a passing suggestion cannot print without both human actions', () => {
  const item = createDemoCases()[0];
  assert.equal(canConfirmPrint(item), false);
  assert.equal(confirmDemoPrint(item), item);
  const reviewed = recordHumanReview(item, 'print_ready', '');
  assert.equal(reviewed.approvalStatus, item.approvalStatus);
  assert.equal(reviewed.print.status, 'unconfirmed');
  assert.equal(canConfirmPrint(reviewed), true);
  const confirmed = confirmDemoPrint(reviewed);
  assert.equal(confirmed.print.status, 'confirmed');
  assert.equal(confirmed.approvalStatus, 'pending');
  assert.equal(canConfirmPrint(confirmed), false);
  assert.equal(confirmDemoPrint(confirmed), confirmed);
});
test('problem claims and holds require an explanation and never silently approve', () => {
  for (const item of createDemoCases().slice(1)) {
    assert.equal(recordHumanReview(item, 'print_ready', ' '), item);
    assert.equal(recordHumanReview(item, 'hold', ''), item);
    const reviewed = recordHumanReview(item, 'hold', '等待补正');
    assert.equal(canConfirmPrint(reviewed), false);
    assert.equal(reviewed.approvalStatus, 'pending');
    assert.equal(reviewed.recommendation, item.recommendation);
  }
});
test('new materials, withdrawn claims and stale confirmations cannot print', () => {
  const ready = recordHumanReview(
    createDemoCases()[0],
    'print_ready',
    '已核实',
  );
  assert.equal(canConfirmPrint({ ...ready, sourceVersion: 2 }), false);
  for (const approvalStatus of ['withdrawn', 'rejected'])
    assert.equal(canConfirmPrint({ ...ready, approvalStatus }), false);
  const changed = invalidateMaterialVersion(confirmDemoPrint(ready));
  assert.equal(changed.review.status, 'unreviewed');
  assert.equal(changed.print.status, 'unconfirmed');
  assert.equal(canConfirmPrint(changed), false);
});
test('preview states are independent and search does not mutate data', () => {
  const items = createDemoCases();
  assert.equal(caseMatches(items[0], '员工甲'), true);
  assert.equal(caseMatches(items[0], '不存在'), false);
  recordHumanReview(items[0], 'print_ready', '');
  assert.equal(items[0].review.status, 'unreviewed');
  assert.equal(createDemoCases()[0].review.status, 'unreviewed');
});
