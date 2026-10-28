/* P04 候选视觉稿：纯本地合成状态；没有 fetch、XHR、文件读取或真实提交。 */
const $ = id => document.getElementById(id)
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character])
const expenseTypes = [
  ['PROJECT', '项目费用'], ['SALES', '销售费用'], ['FINANCE', '财务费用'],
  ['MANAGEMENT', '管理费用'], ['OPERATIONS', '运营费用']
]
// 与当前后端保存的 23 项飞书费用类别目录同名；正式运行仍以飞书当前有效选项为准。
const officialExpenseCategories = [
  '人力采购', '软件采购', '硬件采购', '其他采购', '办公费用', '差旅费用',
  '服务费用', '招待费用', '福利费用', '车辆费用', '房租物业水电', '员工工资',
  '五险一金', '其他费用', '贴息手续费', '招标费用', '快递费用', '财务税费',
  '折旧费用', '电话费用', '交通费用', '装修摊销', '银行费用'
]
const materialKinds = [
  ['RIDE', '网约车'], ['FLIGHT', '飞机票'], ['HOTEL', '酒店住宿'],
  ['DINING', '餐饮'], ['OTHER', '其他票据']
]
// 合成材料的费用类别在演示数据中预设；正式归类不能只凭发票名称推断。
const mixedDemoMaterials = [
  ['网约车发票_01.pdf', '交通费用', 'RIDE', 'invoice', 5688],
  ['网约车发票_02.pdf', '交通费用', 'RIDE', 'invoice', 8162],
  ['网约车行程单_01.pdf', '交通费用', 'RIDE', 'itinerary', 13850],
  ['飞机票_01.pdf', '差旅费用', 'FLIGHT', 'invoice', 68000],
  ['飞机票_02.pdf', '差旅费用', 'FLIGHT', 'invoice', 58000],
  ['酒店住宿_01.pdf', '差旅费用', 'HOTEL', 'invoice', 28000],
  ['酒店住宿_02.pdf', '差旅费用', 'HOTEL', 'invoice', 32000],
  ['酒店住宿_03.pdf', '差旅费用', 'HOTEL', 'invoice', 30000],
  ['餐饮发票_01.pdf', '招待费用', 'DINING', 'invoice', 8860],
  ['餐饮发票_02.pdf', '招待费用', 'DINING', 'invoice', 7800],
  ['餐饮发票_03.pdf', '招待费用', 'DINING', 'invoice', 8000]
]
const money = cents => `¥ ${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  if (typeof resetDescriptionDraft === 'function') resetDescriptionDraft()
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
function materialKindLabel(code) { return materialKinds.find(([key]) => key === code)?.[1] || '其他票据' }
function materialGroups() {
  return officialExpenseCategories.flatMap(category => materialKinds.map(([code, label]) => {
    const files = successfulFiles().filter(file => file.expenseCategory === category && file.materialKind === code)
    const invoices = files.filter(file => file.role === 'invoice')
    const itineraries = files.filter(file => file.role === 'itinerary')
    const invoiceCents = invoices.reduce((sum, file) => sum + file.amountCents, 0)
    const itineraryCents = itineraries.reduce((sum, file) => sum + file.amountCents, 0)
    return {
      category, code, label, files, invoices, itineraries, invoiceCents, itineraryCents,
      reimbursableCents: code === 'RIDE' ? (itineraryCents || invoiceCents) : invoiceCents,
      mismatch: code === 'RIDE' && files.length > 0 &&
        (!invoices.length || !itineraries.length || invoiceCents !== itineraryCents)
    }
  })).filter(group => group.files.length)
}
function categoryGroups(materials = materialGroups()) {
  return officialExpenseCategories.map(name => {
    const groups = materials.filter(group => group.category === name)
    return {
      name, groups,
      invoices: groups.reduce((sum, group) => sum + group.invoices.length, 0),
      itineraries: groups.reduce((sum, group) => sum + group.itineraries.length, 0),
      amountCents: groups.reduce((sum, group) => sum + group.reimbursableCents, 0),
      mismatch: groups.some(group => group.mismatch)
    }
  }).filter(group => group.groups.length)
}
function reviewAmountCents() { return materialGroups().reduce((sum, group) => sum + group.reimbursableCents, 0) }
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
  $('file-list').innerHTML = model.files.length ? model.files.map(file => `<div class="file-row"><span class="file-icon">PDF</span><span class="file-meta"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${escapeHtml(file.expenseCategory)} · ${escapeHtml(materialKindLabel(file.materialKind))}${file.role === 'itinerary' ? '行程单' : '发票'} · ${file.status === 'success' ? '已加入当前演示材料' : file.status === 'failed' ? '处理失败，未计入材料' : '正在处理'}</small></span><span class="file-status ${file.status === 'failed' ? 'failed' : file.status === 'working' ? 'working' : ''}">${file.status === 'success' ? '演示成功' : file.status === 'failed' ? '演示失败' : '处理中'}</span>${file.status === 'failed' ? `<button type="button" class="file-action" data-retry="${file.id}">重试</button>` : ''}<button type="button" class="file-action" data-remove="${file.id}">移除</button></div>`).join('') : '<p class="file-empty">还没有材料。草稿可先保存；预检前需有至少一份成功材料。</p>'
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

function renderCategoryReview(materials) {
  const categories = categoryGroups(materials)
  const invoiceCount = categories.reduce((sum, group) => sum + group.invoices, 0)
  const itineraryCount = categories.reduce((sum, group) => sum + group.itineraries, 0)
  $('expense-summary').innerHTML = [
    ['预计报销总额', money(reviewAmountCents()), 'total'],
    ['发票', `${invoiceCount} 张`, ''],
    ['行程单', `${itineraryCount} 张`, ''],
    ['涉及费用类别', `${categories.length} / ${officialExpenseCategories.length} 类`, '']
  ].map(([label, value, style]) => `<div class="expense-metric ${style}"><small>${label}</small><b>${value}</b></div>`).join('')
  $('category-count').textContent = `本单涉及 ${categories.length} / ${officialExpenseCategories.length} 类`
  const active = new Set(categories.map(group => group.name))
  $('official-category-list').innerHTML = officialExpenseCategories.map(name =>
    `<span class="category-chip ${active.has(name) ? 'active' : ''}">${escapeHtml(name)}</span>`
  ).join('')
  $('expense-groups').innerHTML = categories.map((category, index) => {
    const checks = category.groups.map(group => {
      const ride = group.code === 'RIDE'
      const status = group.mismatch ? '金额不符或缺少行程单' : ride ? '行程单与发票合计匹配' : '发票金额已汇总'
      const note = ride
        ? `行程单合计 ${money(group.itineraryCents)}；发票合计 ${money(group.invoiceCents)}；差额 ${money(Math.abs(group.itineraryCents - group.invoiceCents))}。只计入一次。`
        : `${group.invoices.length} 张发票，价税合计 ${money(group.invoiceCents)}。`
      return `<div class="material-check"><div class="material-check-head"><strong>${escapeHtml(group.label)}</strong><b>${money(group.reimbursableCents)}</b></div>
        <p class="expense-group-note">${escapeHtml(status)}；${note}</p>
        <p class="material-file-list">${group.files.map(file => `${escapeHtml(file.name)}（${file.role === 'itinerary' ? '行程单' : '发票'}）${money(file.amountCents)}`).join('；')}</p></div>`
    }).join('')
    return `<article class="expense-group ${category.mismatch ? 'mismatch' : ''}">
      <div class="expense-line-top"><span class="expense-line-index">${String(index + 1).padStart(2, '0')}</span><div class="expense-line-main"><strong>${escapeHtml(category.name)}</strong><small>${category.invoices} 张发票${category.itineraries ? ` · ${category.itineraries} 张行程单` : ''}</small></div><div class="expense-group-amount"><b>${money(category.amountCents)}</b><small>报销金额</small></div></div>
      <div class="expense-line-description"><label for="description-${index}">费用描述</label><div class="expense-line-editor"><textarea id="description-${index}" rows="2" data-description-category="${escapeHtml(category.name)}" aria-label="${escapeHtml(category.name)}费用描述" placeholder="填写这类费用的用途，可编辑"></textarea><button type="button" class="button secondary" data-generate-category="${escapeHtml(category.name)}">生成初稿</button></div><small data-description-feedback="${escapeHtml(category.name)}">可根据本类材料生成，也可直接修改。</small></div>
      <details class="expense-line-evidence"><summary>${category.mismatch ? '金额待核对' : '查看材料与核对依据'}</summary><div class="material-checks">${checks}</div></details>
    </article>`
  }).join('') || '<p class="notice">当前没有可汇总的费用明细。</p>'
}

function renderReview(mode) {
  const groups = materialGroups()
  const mismatch = groups.some(group => group.mismatch)
  model.reviewMode = mode === 'supplement' ? 'supplement' : mismatch ? 'mismatch' : 'ready'
  model.view = 'review'
  renderCompose()
  const supplement = mode === 'supplement'
  const blocked = supplement || mismatch
  if (blocked) {
    $('page-title').textContent = '核对材料后再提交'
    $('page-subtitle').textContent = '当前有需要处理的材料；其他费用类别仍按各自金额展示，不会和网约车行程单混算。'
  }
  $('review-title').textContent = supplement ? '需要补充材料' : mismatch ? '需核对网约车材料' : '可提交，需财务复核'
  $('review-description').textContent = supplement ? '材料中有必要信息尚不可辨认。请返回补充或重试失败的文件，当前不能提交。' : mismatch ? '网约车行程单与本组发票金额未匹配，请返回核对；其他类别的金额已分别汇总。' : '系统已按费用类别分别汇总。请核对整单金额与各组材料；需复核的部分将随单交给财务。'
  $('review-state').textContent = blocked ? '暂不能提交' : '可继续'
  $('review-state').classList.toggle('supplement', blocked)
  renderCategoryReview(groups)
  $('review-evidence').innerHTML = `<div class="evidence-row"><b>材料状态</b><span>${successfulFiles().length} 份演示材料已通过，${pendingFiles().length} 份需处理</span></div><div class="evidence-row"><b>规则结论</b><span>${supplement ? '关键材料仍需补充，当前没有确认资格' : mismatch ? '网约车组金额未匹配；其余类别单独保留已识别金额' : '费用用途交由财务复核；金额与日期保留已识别原值'}</span></div>`
  const project = selectedProject()
  $('generated-content').innerHTML = [
    ['报销类型', typeLabel()], ['归属', model.expenseType === 'PROJECT' ? `${project?.name || '未选项目'} · ${model.stage || '阶段未选'}` : `${selectedOrg()?.name || '未选组织'} · ${model.subdepartment || '未选子部门'}`],
    ['项目迭代', model.expenseType === 'PROJECT' ? project?.iteration || '未带出' : '不适用'],
    ['付款主体', '演示付款主体（以实际权威来源为准）'], ['系统生成明细', supplement ? '待补充后生成' : `${categoryGroups(groups).length} 条费用明细`],
    ['系统识别材料', `${successfulFiles().length} 份：${groups.reduce((sum, group) => sum + group.invoices.length, 0)} 张发票、${groups.reduce((sum, group) => sum + group.itineraries.length, 0)} 张行程单`],
    ['系统生成金额', blocked ? '需核对后确认' : money(reviewAmountCents())]
  ].map(([key, value]) => `<div class="generated-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')
  if (typeof syncDescriptionDraft === 'function') syncDescriptionDraft()
  $('ack-label').hidden = blocked
  $('submit-error').hidden = true
  $('acknowledge').checked = false
  $('submit-button').disabled = true
  $('submit-button').classList.remove('loading')
  $('submit-button').textContent = '确认并提交'
  $('submit-button').hidden = blocked
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

function addDemoFile(status = 'success', name, details = {}) {
  model.files.push({
    id: model.nextFile++, status, name: name || `演示材料_${model.nextFile}.pdf`,
    expenseCategory: details.expenseCategory || '其他费用',
    materialKind: details.materialKind || 'OTHER', role: details.role || 'invoice',
    amountCents: details.amountCents ?? 26850
  })
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
  if (model.view !== 'review' || model.reviewMode !== 'ready' || !$('acknowledge').checked || model.submitting) return
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
    model.history.unshift({ id, status, label: kind === 'success' ? '审批中' : kind === 'failed' ? '技术提交失败' : '提交结果待确认', amount: money(reviewAmountCents()), date: '2026-10-13', updated: '2026-10-13', type: typeLabel(), files: successfulFiles().length })
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
  if (['ready', 'supplement', 'submitting'].includes(name)) {
    mixedDemoMaterials.forEach(([fileName, expenseCategory, materialKind, role, amountCents]) =>
      addDemoFile('success', fileName, { expenseCategory, materialKind, role, amountCents }))
  } else {
    addDemoFile('success', '演示电子发票_20261013.pdf')
  }
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
