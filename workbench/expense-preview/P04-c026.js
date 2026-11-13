// Synthetic design interaction only. Each expense category owns one editable description.
const categoryDescriptions = new Map()
const editedDescriptions = new Set()
const pendingDescriptions = new Map()
let descriptionGeneration = 0

function resetDescriptionDraft() {
  categoryDescriptions.clear()
  editedDescriptions.clear()
  pendingDescriptions.clear()
}

function descriptionDraftForCategory(category) {
  const purpose = {
    '差旅费用': '赴客户现场出差',
    '招待费用': '客户接待餐饮',
    '交通费用': '市内公务出行',
    '福利费用': '员工福利餐饮'
  }[category.name]
  const materials = category.groups.map(group => {
    const invoiceName = { RIDE: '网约车发票', FLIGHT: '机票', TRAIN: '火车票', HOTEL: '住宿发票', DINING: '餐饮发票' }[group.code] || '发票'
    const invoices = `${invoiceName}${group.invoices.length}张`
    return group.itineraries.length ? `${invoices}、行程单${group.itineraries.length}张` : invoices
  }).join('、')
  return `${purpose || `本次${category.name}`}，${materials}。`
}

function syncDescriptionDraft() {
  const categories = new Map(categoryGroups().map(category => [category.name, category]))
  document.querySelectorAll('[data-description-category]').forEach(textarea => {
    const name = textarea.dataset.descriptionCategory
    const category = categories.get(name)
    if (!category) return
    if (!editedDescriptions.has(name)) categoryDescriptions.set(name, descriptionDraftForCategory(category))
    textarea.value = categoryDescriptions.get(name) || ''
    const feedback = document.querySelector(`[data-description-feedback="${name}"]`)
    const generate = document.querySelector(`[data-generate-category="${name}"]`)
    feedback.textContent = ''
    feedback.hidden = true
    textarea.addEventListener('input', () => {
      categoryDescriptions.set(name, textarea.value)
      editedDescriptions.add(name)
      pendingDescriptions.delete(name)
      feedback.hidden = true
    })
    generate.addEventListener('click', () => {
      const token = ++descriptionGeneration
      pendingDescriptions.set(name, token)
      feedback.textContent = '正在生成…'
      feedback.hidden = false
      window.setTimeout(() => {
        if (!textarea.isConnected || pendingDescriptions.get(name) !== token) return
        const draft = descriptionDraftForCategory(category)
        textarea.value = draft
        categoryDescriptions.set(name, draft)
        editedDescriptions.delete(name)
        pendingDescriptions.delete(name)
        feedback.hidden = true
      }, 600)
    })
  })
}

document.getElementById('c026-mismatch-demo').addEventListener('click', () => {
  demo('ready')
  const rideInvoice = model.files.find(file => file.materialKind === 'RIDE' && file.role === 'invoice')
  rideInvoice.amountCents += 1200
  renderReview('ready')
})
document.getElementById('c026-generate-fail-demo').addEventListener('click', () => {
  demo('ready')
  document.querySelectorAll('[data-description-feedback]').forEach(feedback => {
    feedback.textContent = '生成失败，可直接编辑。'
    feedback.hidden = false
  })
})

// 分类草稿在确认时一次应用，取消不修改当前报销材料。
let classificationDraft = null
let classificationOpener = null
const classificationOverlay = $('category-adjust-overlay')
function classificationOptions(value) {
  return officialExpenseCategories.map(name => `<option value="${escapeHtml(name)}" ${name === value ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')
}
function bindCategoryAdjustment() {
  document.querySelectorAll('[data-adjust-category]').forEach(button => {
    button.disabled = model.submitting
    button.onclick = () => openCategoryAdjustment(button.dataset.adjustCategory, button)
  })
}
function openCategoryAdjustment(category, opener) {
  const files = successfulFiles().filter(file => file.role === 'invoice' &&
    ['DINING', 'RIDE'].includes(file.materialKind) && file.expenseCategory === category)
  classificationDraft = { generation: model.generation, files,
    categories: new Map(files.map(file => [String(file.id), file.expenseCategory])), selected: new Set() }
  classificationOpener = opener
  $('category-adjust-title').textContent = `调整分类 · ${category}`
  $('classification-target').innerHTML = '<option value="">选择批量调整类别</option>' + classificationOptions('')
  $('classification-total').textContent = `${files.length} 张发票 · 合计 ${money(files.reduce((sum, file) => sum + file.amountCents, 0))}`
  classificationOverlay.hidden = false
  document.body.classList.add('classification-open')
  renderClassificationRows()
  classificationOverlay.querySelector('[role="dialog"]').focus()
}
function renderClassificationRows() {
  const draft = classificationDraft
  $('classification-rows').innerHTML = draft.files.map(file => {
    const id = String(file.id)
    return `<tr><td><input type="checkbox" data-classification-check="${escapeHtml(id)}" aria-label="选择${escapeHtml(file.name)}" ${draft.selected.has(id) ? 'checked' : ''}></td><td><strong>${escapeHtml(file.name)}</strong><small>${materialKindLabel(file.materialKind)}</small></td><td>${money(file.amountCents)}</td><td><select data-classification-choice="${escapeHtml(id)}" aria-label="${escapeHtml(file.name)}费用类别">${classificationOptions(draft.categories.get(id))}</select></td></tr>`
  }).join('')
  document.querySelectorAll('[data-classification-check]').forEach(input => input.onchange = () => {
    if (input.checked) draft.selected.add(input.dataset.classificationCheck)
    else draft.selected.delete(input.dataset.classificationCheck)
    $('classification-target').value = ''
    updateClassificationSelection()
  })
  document.querySelectorAll('[data-classification-choice]').forEach(select => select.onchange = () => {
    draft.categories.set(select.dataset.classificationChoice, select.value)
    renderClassificationPreview()
  })
  updateClassificationSelection()
  renderClassificationPreview()
}
function updateClassificationSelection() {
  const draft = classificationDraft
  $('classification-selected').textContent = `已选 ${draft.selected.size} 张`
  $('classification-all').checked = Boolean(draft.files.length && draft.selected.size === draft.files.length)
  $('classification-all').indeterminate = draft.selected.size > 0 && draft.selected.size < draft.files.length
  $('classification-target').disabled = !draft.selected.size
}
function closeCategoryAdjustment() {
  classificationOverlay.hidden = true
  document.body.classList.remove('classification-open')
  classificationDraft = null
  if (classificationOpener?.isConnected) classificationOpener.focus()
  else document.querySelector('[data-adjust-category]')?.focus()
}
$('classification-all').onchange = event => {
  classificationDraft.selected = new Set(event.target.checked ? classificationDraft.files.map(file => String(file.id)) : [])
  $('classification-target').value = ''
  renderClassificationRows()
}
$('classification-target').onchange = () => {
  const target = $('classification-target').value
  if (!target || !classificationDraft.selected.size) return
  classificationDraft.selected.forEach(id => classificationDraft.categories.set(id, target))
  renderClassificationRows()
}
// 预览只计算分类分配，不更改票面金额或当前材料。
function classificationChanges() {
  return classificationDraft.files.filter(file => file.expenseCategory !== classificationDraft.categories.get(String(file.id)))
}
function classificationImpact(changed) {
  const current = new Map(categoryGroups().map(category => [category.name, { cents: category.amountCents, count: category.invoices }]))
  const next = new Map([...current].map(([name, value]) => [name, { ...value }]))
  const affected = new Set()
  changed.forEach(file => {
    const from = file.expenseCategory, to = classificationDraft.categories.get(String(file.id))
    affected.add(from); affected.add(to)
    for (const [name, direction] of [[from, -1], [to, 1]]) {
      const value = next.get(name) || { cents: 0, count: 0 }
      next.set(name, { cents: value.cents + direction * file.amountCents, count: value.count + direction })
    }
  })
  return officialExpenseCategories.filter(name => affected.has(name)).map(name => ({
    name, before: current.get(name) || { cents: 0, count: 0 }, after: next.get(name)
  }))
}
function classificationImpactRows(impacts) {
  return impacts.map(({name, before, after}) => `<div class="classification-impact-row"><strong>${escapeHtml(name)}</strong><span>${before.count} 张 · ${money(before.cents)}</span><i>→</i><b>${after.count} 张 · ${money(after.cents)}${!before.count ? '（新增）' : !after.count ? '（移除）' : ''}</b></div>`).join('')
}
function renderClassificationPreview() {
  const changed = classificationChanges()
  const target = $('classification-preview')
  target.hidden = !changed.length
  target.innerHTML = changed.length ? `<strong>保存后的费用明细</strong>${classificationImpactRows(classificationImpact(changed))}<small>整单合计 ${money(reviewAmountCents())}（不变）</small>` : ''
  $('category-adjust-save').textContent = changed.length ? `保存并更新明细（${changed.length} 张）` : '保存并更新明细'
  $('category-adjust-save').disabled = !changed.length
}
$('category-adjust-save').onclick = () => {
  const draft = classificationDraft
  if (!draft || draft.generation !== model.generation) { closeCategoryAdjustment(); return }
  const changed = classificationChanges()
  const impacts = classificationImpact(changed)
  changed.forEach(file => { file.expenseCategory = draft.categories.get(String(file.id)) })
  if (changed.length) { model.dirty = true; renderReview(model.reviewMode) }
  closeCategoryAdjustment()
  const result = $('classification-result')
  result.hidden = false
  result.innerHTML = `<strong>已更新 ${changed.length} 张发票的分类</strong>${classificationImpactRows(impacts)}<small>整单合计 ${money(reviewAmountCents())}（不变）</small>`
  impacts.forEach(({name}) => {
    document.querySelectorAll('[data-expense-category]').forEach(article => {
      if (article.dataset.expenseCategory !== name) return
      article.classList.add('category-updated')
      const badge = document.createElement('span')
      badge.className = 'category-updated-badge'
      badge.textContent = '已更新'
      article.querySelector('.expense-line-main strong').append(badge)
    })
  })
  result.focus({ preventScroll: true })
  result.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
$('category-adjust-close').onclick = closeCategoryAdjustment
$('category-adjust-cancel').onclick = closeCategoryAdjustment
classificationOverlay.onclick = event => { if (event.target === classificationOverlay) closeCategoryAdjustment() }
classificationOverlay.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.stopPropagation(); closeCategoryAdjustment() }
  if (event.key !== 'Tab') return
  const controls = [...classificationOverlay.querySelectorAll('button:not(:disabled), select, input')]
  const first = controls[0], last = controls[controls.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === classificationOverlay.querySelector('[role="dialog"]'))) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
})
if (new URLSearchParams(location.search).get('review') === '1') demo('ready')
