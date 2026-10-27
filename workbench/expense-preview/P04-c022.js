/* P04 候选视觉稿：纯本地合成状态；没有 fetch、XHR、文件读取或真实提交。 */
const $ = id => document.getElementById(id)
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character])
const expenseTypes = [
  ['PROJECT', '项目费用'], ['SALES', '销售费用'], ['FINANCE', '财务费用'],
  ['MANAGEMENT', '管理费用'], ['OPERATIONS', '运营费用']
]
const projects = [
  { id: 'visual-project-one', name: '数字员工－内部运营助手', stages: ['内部研发'], iteration: '无' },
  { id: 'visual-project-many', name: '演示项目－多阶段协作', stages: ['方案设计', '项目交付'], iteration: '无' }
]
const organizations = [
  { id: 'visual-op', name: '演示 OP 组织', subs: ['研发组', '交付组'] },
  { id: 'visual-center', name: '演示中心组织', subs: ['运营中心', '财务中心'] }
]
const initialHistory = [
  { id: 'VIS-103', status: 'pending', label: '审批中', amount: '¥ 268.50', date: '2026-10-12', updated: '2026-10-12', type: '项目费用', files: 2 },
  { id: 'VIS-102', status: 'rejected', label: '业务审批驳回', amount: '¥ 1,260.00', date: '2026-10-11', updated: '2026-10-12', type: '运营费用', files: 1 },
  { id: 'VIS-101', status: 'draft', label: '草稿', amount: '金额待生成', date: '2026-10-10', updated: '2026-10-10', type: '销售费用', files: 1 }
]

const model = {
  expenseType: null, projectId: null, stage: null, organizationId: null, subdepartment: null,
  keyword: '', filteredProjects: [...projects], files: [], dirty: false, view: 'compose',
  reviewMode: 'ready', prechecking: false, submitting: false, lastResult: null,
  history: [...initialHistory], drawerOpen: false, selectedHistoryId: null,
  pendingConfirm: null, nextFile: 1, nextRecord: 104, generation: 0
}

function resetDraft() {
  model.generation += 1
  model.expenseType = null
  model.projectId = null
  model.stage = null
  model.organizationId = null
  model.subdepartment = null
  model.keyword = ''
  model.filteredProjects = [...projects]
  model.files = []
  model.dirty = false
  model.view = 'compose'
  model.prechecking = false
  model.submitting = false
  $('acknowledge').checked = false
  $('precheck-error').hidden = true
  $('submit-error').hidden = true
}

function selectedProject() { return projects.find(project => project.id === model.projectId) }
function selectedOrg() { return organizations.find(org => org.id === model.organizationId) }
function attributionReady() {
  return model.expenseType === 'PROJECT' ? Boolean(selectedProject() && model.stage) :
    Boolean(model.expenseType && selectedOrg() && model.subdepartment)
}
function successfulFiles() { return model.files.filter(file => file.status === 'success') }
function pendingFiles() { return model.files.filter(file => file.status !== 'success') }
function typeLabel() { return expenseTypes.find(([code]) => code === model.expenseType)?.[1] || '未选择' }
function listStatusLabel(status) {
  return {
    draft: '草稿', rejected: '需要处理', supplement: '需要处理',
    failed: '提交失败', unknown: '结果待确认', submitting: '提交中',
    pending: '审批中', submitted: '已提交', approved: '已通过'
  }[status] || '状态待核实'
}
function updateHistorySummary() {
  const counts = model.history.reduce((result, item) => {
    const label = listStatusLabel(item.status)
    result[label] = (result[label] || 0) + 1
    return result
  }, {})
  const summary = ['需要处理', '结果待确认', '提交失败', '草稿']
    .filter(label => counts[label])
    .map(label => `${counts[label]} 条${label}`)
  $('my-card-summary').textContent = [`${model.history.length} 条申请`, ...summary].join(' · ')
}

function renderTypeOptions() {
  $('type-grid').innerHTML = expenseTypes.map(([code, label]) =>
    `<button type="button" class="type-option ${model.expenseType === code ? 'selected' : ''}" data-type="${code}" aria-pressed="${model.expenseType === code}">${label}</button>`
  ).join('')
  document.querySelectorAll('[data-type]').forEach(button => button.onclick = () => {
    if (model.expenseType === button.dataset.type) return
    model.expenseType = button.dataset.type
    model.projectId = null
    model.stage = null
    model.organizationId = null
    model.subdepartment = null
    model.dirty = true
    renderCompose()
  })
}

function renderAttribution() {
  const target = $('attribution')
  if (!model.expenseType) { target.innerHTML = ''; return }
  if (model.expenseType === 'PROJECT') {
    const project = selectedProject()
    target.innerHTML = `<div class="field-row"><div class="field-block"><label for="project-choice">选择项目 <em>*</em></label><select id="project-choice"><option value="">请选择项目（无需先搜索）</option>${model.filteredProjects.map(item => `<option value="${item.id}" ${model.projectId === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div>
      ${project?.stages.length > 1 ? `<div class="field-block"><label for="stage-choice">项目阶段 <em>*</em></label><select id="stage-choice"><option value="">请选择当前阶段</option>${project.stages.map(stage => `<option value="${escapeHtml(stage)}" ${model.stage === stage ? 'selected' : ''}>${escapeHtml(stage)}</option>`).join('')}</select></div>` : `<div class="field-block"><label>项目阶段</label><div class="derived" style="margin-top:0;min-height:43px"><strong>${escapeHtml(model.stage || '选定项目后自动带出')}</strong></div></div>`}</div>
      ${project ? `<div class="derived"><span>系统带出迭代</span><strong>${escapeHtml(project.iteration)}</strong><span>组织及子部门由确认的项目上下文生成</span></div>` : '<p class="field-help">先确认项目；同名多阶段项目只出现一次，多个有效阶段才需要您选择。</p>'}`
    const helper = document.createElement('p')
    helper.className = 'field-help'
    helper.textContent = '可直接选择；正式页面支持下拉内可选搜索与服务端分页加载更多。本原型仅两条合成候选。'
    target.append(helper)
    $('project-choice').onchange = event => {
      model.projectId = event.target.value || null
      const current = selectedProject()
      model.stage = current?.stages.length === 1 ? current.stages[0] : null
      model.dirty = true
      renderCompose()
    }
    const stageChoice = $('stage-choice')
    if (stageChoice) stageChoice.onchange = event => { model.stage = event.target.value || null; model.dirty = true; renderCompose() }
    return
  }
  const org = selectedOrg()
  target.innerHTML = `<div class="field-row"><div class="field-block"><label for="organization-choice">组织结构 <em>*</em></label><select id="organization-choice"><option value="">请选择实际发生的组织</option>${organizations.map(item => `<option value="${item.id}" ${model.organizationId === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select></div><div class="field-block"><label for="subdepartment-choice">子部门组织 <em>*</em></label><select id="subdepartment-choice" ${org ? '' : 'disabled'}><option value="">${org ? '请选择子部门' : '请先选择组织'}</option>${org?.subs.map(item => `<option value="${item}" ${model.subdepartment === item ? 'selected' : ''}>${item}</option>`).join('') || ''}</select></div></div><p class="field-help">选择费用实际发生的组织与子部门，不默认使用上传人的所属部门。</p>`
  const refresh = document.createElement('button')
  refresh.type = 'button'
  refresh.className = 'button secondary'
  refresh.textContent = '刷新组织候选'
  refresh.onclick = () => { refresh.disabled = true; refresh.textContent = '正在加载组织…'; setTimeout(() => { refresh.disabled = false; refresh.textContent = '刷新组织候选'; }, 650) }
  target.append(refresh)
  $('organization-choice').onchange = event => { model.organizationId = event.target.value || null; model.subdepartment = null; model.dirty = true; renderCompose() }
  $('subdepartment-choice').onchange = event => { model.subdepartment = event.target.value || null; model.dirty = true; renderCompose() }
}

function renderFiles() {
  $('upload-zone').classList.toggle('disabled', !attributionReady())
  $('add-demo-file').disabled = !attributionReady()
  $('file-list').innerHTML = model.files.length ? model.files.map(file => `<div class="file-row"><span class="file-icon">PDF</span><span class="file-meta"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${file.status === 'success' ? '已加入当前演示材料' : file.status === 'failed' ? '文件处理失败，当前未加入材料' : '正在处理该文件'}</small></span><span class="file-status ${file.status === 'failed' ? 'failed' : file.status === 'working' ? 'working' : ''}">${file.status === 'success' ? '演示成功' : file.status === 'failed' ? '演示失败' : '处理中'}</span>${file.status === 'failed' ? `<button type="button" class="file-action" data-retry="${file.id}">重试</button>` : ''}<button type="button" class="file-action" data-remove="${file.id}">移除</button></div>`).join('') : '<p class="file-empty">还没有材料。草稿可先保存；预检前需有至少一份成功材料。</p>'
  document.querySelectorAll('[data-retry]').forEach(button => button.onclick = () => retryFile(Number(button.dataset.retry)))
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
    model.files = model.files.filter(file => file.id !== Number(button.dataset.remove)); model.dirty = true; renderFiles(); renderPrecheckButton()
  })
}

function retryFile(id) {
  const file = model.files.find(item => item.id === id)
  if (!file || file.status !== 'failed') return
  const generation = model.generation
  file.status = 'working'; renderFiles()
  setTimeout(() => { if (generation === model.generation && model.files.includes(file)) { file.status = 'success'; renderFiles(); renderPrecheckButton() } }, 650)
}

function renderPrecheckButton() {
  const button = $('precheck-button')
  button.disabled = model.prechecking || !attributionReady() || successfulFiles().length === 0 || pendingFiles().length > 0
  button.textContent = model.prechecking ? '正在识别与预检…' : '保存并查看结论 →'
}

function renderCompose() {
  $('compose-panel').hidden = model.view !== 'compose'
  $('review-panel').hidden = model.view !== 'review'
  $('step-one').classList.toggle('active', model.view === 'compose')
  $('step-two').classList.toggle('active', model.view === 'review')
  $('page-title').textContent = model.view === 'compose' ? '先确定费用归属' : '核对一下，就可以提交'
  $('page-subtitle').textContent = model.view === 'compose' ? '选择费用归属，上传发票材料。票面和费用明细由系统识别，提交前由您核对。' : '请核对系统结论。需复核的部分会随单交给财务，不需要您填写系统生成字段。'
  renderTypeOptions(); renderAttribution(); renderFiles(); renderPrecheckButton(); renderResult()
}

function renderReview(mode) {
  model.reviewMode = mode
  model.view = 'review'
  renderCompose()
  const supplement = mode === 'supplement'
  $('review-title').textContent = supplement ? '需要补充材料' : '可提交，需财务复核'
  $('review-description').textContent = supplement ? '材料中有必要信息尚不可辨认。请返回补充或重试失败的文件，当前不能提交。' : '材料可读，已保留可靠事实；费用用途仍需财务复核，不影响您继续本人确认。'
  $('review-state').textContent = supplement ? '待补材料' : '可继续'
  $('review-state').classList.toggle('supplement', supplement)
  $('review-evidence').innerHTML = `<div class="evidence-row"><b>材料状态</b><span>${successfulFiles().length} 份演示材料已通过，${pendingFiles().length} 份需处理</span></div><div class="evidence-row"><b>规则结论</b><span>${supplement ? '关键材料仍需补充，当前没有确认资格' : '票据用途交由财务复核；已识别金额与日期保持原值'}</span></div>`
  const project = selectedProject()
  $('generated-content').innerHTML = [
    ['报销类型', typeLabel()], ['归属', model.expenseType === 'PROJECT' ? `${project?.name || '未选项目'} · ${model.stage || '阶段未选'}` : `${selectedOrg()?.name || '未选组织'} · ${model.subdepartment || '未选子部门'}`],
    ['项目迭代', model.expenseType === 'PROJECT' ? project?.iteration || '未带出' : '不适用'],
    ['付款主体', '演示付款主体（以实际权威来源为准）'], ['系统生成明细', supplement ? '待补充后生成' : '1 条演示明细'],
    ['系统识别票据', `${successfulFiles().length} 份演示材料`], ['系统生成金额', supplement ? '金额待核验' : '¥ 268.50']
  ].map(([key, value]) => `<div class="generated-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')
  $('ack-label').hidden = supplement
  $('submit-error').hidden = true
  $('acknowledge').checked = false
  $('submit-button').disabled = true
  $('submit-button').classList.remove('loading')
  $('submit-button').textContent = '确认并提交'
  $('submit-button').hidden = supplement
}

function renderResult() {
  const result = model.lastResult
  const target = $('latest-result')
  target.hidden = !result
  if (!result) return
  target.className = `result-card ${result.kind}`
  const details = {
    success: ['已发起飞书审批', '您可以在“我的报销”中查看这笔申请的进展。'],
    failed: ['暂未提交成功', '这笔申请尚未发起审批，您可以稍后查看详情。'],
    unknown: ['提交结果待确认', '请查询这笔申请的最新状态，暂时不要再次提交。']
  }[result.kind]
  target.innerHTML = `<span class="result-mark">${result.kind === 'success' ? '✓' : result.kind === 'failed' ? '×' : '?'}</span><div class="result-text"><strong>${details[0]}</strong><p>${details[1]} <span>演示记录 ${escapeHtml(result.id)}</span></p></div>${result.kind === 'unknown' ? '<button id="query-original" class="button secondary" type="button">查询原记录</button>' : ''}`
  if (result.kind === 'unknown') $('query-original').onclick = queryOriginal
}

function queryOriginal() {
  const button = $('query-original')
  if (!button || model.lastResult?.kind !== 'unknown') return
  button.disabled = true
  button.textContent = '正在查询原记录…'
  setTimeout(() => {
    if (model.lastResult?.kind !== 'unknown') return
    button.disabled = false
    button.textContent = '再次查询原记录'
    const text = $('latest-result').querySelector('.result-text p')
    text.textContent = `这笔申请仍在确认中，演示记录 ${model.lastResult.id}；请稍后查询。`
  }, 850)
}

function openDrawer() {
  model.drawerOpen = true
  $('drawer-backdrop').hidden = false
  $('history-drawer').classList.add('open')
  $('history-drawer').setAttribute('aria-hidden', 'false')
  renderDrawer()
}
function closeDrawer() {
  model.drawerOpen = false
  $('drawer-backdrop').hidden = true
  $('history-drawer').classList.remove('open')
  $('history-drawer').setAttribute('aria-hidden', 'true')
  model.selectedHistoryId = null
}
function renderDrawer() {
  const item = model.history.find(record => record.id === model.selectedHistoryId)
  $('drawer-back').hidden = !item
  $('drawer-title').textContent = item ? '报销详情' : '我的报销'
  if (!item) {
    $('drawer-content').innerHTML = `<p class="drawer-subtitle">仅查看本人记录 · 合成演示数据 · 第 1 页 / 共 ${model.history.length} 条</p>${model.history.map(record => `<button type="button" class="history-row" data-record="${record.id}"><div><strong>报销记录 ${record.id}</strong><small>${record.date} 创建 · ${record.updated} 更新</small><p class="history-amount">${record.amount}</p></div><span class="history-badge ${record.status}">${listStatusLabel(record.status)}</span><span aria-hidden="true">›</span></button>`).join('')}`
    document.querySelectorAll('[data-record]').forEach(button => button.onclick = () => { model.selectedHistoryId = button.dataset.record; renderDrawer() })
    return
  }
  const followup = item.status === 'rejected'
    ? '<button id="reprocess-history" class="button primary" type="button">修改并重新提交</button><p class="detail-note">进入修改前，会先核对原审批确实被业务驳回。</p>'
    : item.status === 'draft'
      ? '<button id="continue-history" class="button secondary" type="button">继续填写</button>'
      : ['unknown', 'submitting'].includes(item.status)
        ? '<button id="query-history-original" class="button secondary" type="button">核实原提交结果</button><p id="history-query-result" class="detail-note">结果尚未确定，请核实这笔原申请；现在不能再次提交。</p>'
        : item.status === 'failed'
          ? '<p class="detail-note">提交失败：审批未受理。请查看原提交记录的失败原因并核对材料；这不是业务驳回，当前不能直接使用驳回重提入口。</p>'
          : '<p class="detail-note">当前记录只读，可查看但不可修改材料。</p>'
  $('drawer-content').innerHTML = `<div class="history-detail"><h3>报销记录 ${item.id}</h3><span class="history-badge ${item.status}">${item.label}</span><div class="detail-line"><span>报销金额</span><strong>${item.amount}</strong></div><div class="detail-line"><span>费用类型</span><strong>${item.type}</strong></div><div class="detail-line"><span>创建时间</span><strong>${item.date}</strong></div><div class="detail-line"><span>最近更新</span><strong>${item.updated}</strong></div><div class="detail-line"><span>材料数量</span><strong>${item.files} 份演示材料</strong></div><div class="detail-line"><span>飞书审批</span><strong>${item.status === 'draft' ? '尚未发起' : item.label}</strong></div>${followup}</div>`
  const reprocess = $('reprocess-history')
  if (reprocess) reprocess.onclick = () => protectUnsaved(() => {
    reprocess.disabled = true; reprocess.textContent = '正在核验原审批…'
    setTimeout(() => { if (model.selectedHistoryId !== item.id) return; resetDraft(); model.expenseType = 'OPERATIONS'; model.organizationId = 'visual-center'; model.subdepartment = '运营中心'; model.dirty = false; closeDrawer(); renderCompose(); window.scrollTo({ top: 0, behavior: 'smooth' }) }, 700)
  })
  const continueButton = $('continue-history')
  if (continueButton) continueButton.onclick = () => protectUnsaved(() => { resetDraft(); model.expenseType = 'SALES'; model.organizationId = 'visual-op'; model.subdepartment = '交付组'; closeDrawer(); renderCompose(); window.scrollTo({ top: 0, behavior: 'smooth' }) })
  const queryButton = $('query-history-original')
  if (queryButton) queryButton.onclick = () => {
    queryButton.disabled = true
    queryButton.textContent = '正在核实原记录…'
    setTimeout(() => {
      if (model.selectedHistoryId !== item.id) return
      queryButton.disabled = false
      queryButton.textContent = '再次核实原记录'
      $('history-query-result').textContent = '这笔原申请仍未得到明确结果；请稍后再查，期间不要再次提交。'
    }, 850)
  }
}

function protectUnsaved(next) {
  if (!model.dirty) { next(); return }
  model.pendingConfirm = next
  $('confirm-overlay').hidden = false
}
function closeConfirm() { model.pendingConfirm = null; $('confirm-overlay').hidden = true }

function addDemoFile(status = 'success', name) {
  model.files.push({ id: model.nextFile++, status, name: name || `演示材料_${model.nextFile}.pdf` })
  model.dirty = true
  renderFiles(); renderPrecheckButton()
}
function precheck(mode = 'ready', delay = 850) {
  if (!attributionReady() || !successfulFiles().length || pendingFiles().length || model.prechecking) return
  const generation = model.generation
  $('precheck-error').hidden = true
  model.prechecking = true; renderPrecheckButton()
  setTimeout(() => {
    if (generation !== model.generation || !model.prechecking) return
    model.prechecking = false
    if (mode === 'failed') { $('precheck-error').hidden = false; renderPrecheckButton(); return }
    renderReview(mode)
  }, delay)
}
function submit() {
  if (model.view !== 'review' || model.reviewMode === 'supplement' || !$('acknowledge').checked || model.submitting) return
  const generation = model.generation
  model.submitting = true
  $('submit-button').disabled = true
  $('submit-button').classList.add('loading')
  $('submit-button').textContent = '正在提交飞书审批，请勿重复操作'
  const outcome = $('outcome-choice').value
  setTimeout(() => {
    if (generation !== model.generation || !model.submitting) return
    if (outcome === 'before-attempt') {
      model.submitting = false
      $('submit-button').disabled = false
      $('submit-button').classList.remove('loading')
      $('submit-button').textContent = '确认并提交'
      $('submit-error').hidden = false
      return
    }
    const id = `VIS-${model.nextRecord++}`
    const kind = outcome === 'failed' ? 'failed' : outcome === 'unknown' ? 'unknown' : 'success'
    const status = kind === 'success' ? 'pending' : kind
    model.history.unshift({ id, status, label: kind === 'success' ? '审批中' : kind === 'failed' ? '技术提交失败' : '提交结果待确认', amount: '¥ 268.50', date: '2026-10-13', updated: '2026-10-13', type: typeLabel(), files: successfulFiles().length })
    resetDraft()
    model.lastResult = { id, kind }
    updateHistorySummary()
    renderCompose()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 1100)
}

function demo(name) {
  resetDraft(); model.lastResult = null
  if (name === 'blank') { renderCompose(); return }
  model.expenseType = 'PROJECT'
  model.filteredProjects = [...projects]
  model.projectId = 'visual-project-one'
  model.stage = '内部研发'
  if (name === 'partial') {
    addDemoFile('success', '演示电子发票_20261013.pdf')
    addDemoFile('failed', '非常非常长的演示附件名称_跨部门差旅与酒店材料_20261013_第二份_多页扫描文件.pdf')
    renderCompose(); return
  }
  addDemoFile('success', '演示电子发票_20261013.pdf')
  if (name === 'prechecking') { renderCompose(); precheck('ready', 12000); return }
  if (name === 'precheck-failed') { renderCompose(); precheck('failed', 800); return }
  renderReview(name === 'supplement' ? 'supplement' : 'ready')
  if (name === 'submitting') {
    $('acknowledge').checked = true
    model.submitting = true
    $('submit-button').disabled = true
    $('submit-button').classList.add('loading')
    $('submit-button').textContent = '正在提交飞书审批，请勿重复操作'
  }
}

$('add-demo-file').onclick = () => { if (attributionReady()) addDemoFile('success', '演示电子发票_20261013.pdf') }
$('precheck-button').onclick = () => precheck('ready')
$('back-to-compose').onclick = () => { model.view = 'compose'; renderCompose() }
$('acknowledge').onchange = () => { $('submit-button').disabled = !$('acknowledge').checked || model.submitting }
$('submit-button').onclick = submit
$('my-card-open').onclick = openDrawer
$('drawer-close').onclick = closeDrawer
$('drawer-backdrop').onclick = closeDrawer
$('drawer-back').onclick = () => { model.selectedHistoryId = null; renderDrawer() }
$('confirm-cancel').onclick = closeConfirm
$('confirm-continue').onclick = () => { const next = model.pendingConfirm; closeConfirm(); next?.() }
document.querySelectorAll('[data-demo]').forEach(button => button.onclick = () => demo(button.dataset.demo))
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!$('confirm-overlay').hidden) closeConfirm(); else if (model.drawerOpen) closeDrawer() } })
renderCompose()
updateHistorySummary()
