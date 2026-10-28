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
    '交通费用': '市内公务出行'
  }[category.name]
  const materials = category.groups.map(group => {
    const invoiceName = { RIDE: '网约车发票', FLIGHT: '机票', HOTEL: '住宿发票', DINING: '餐饮发票' }[group.code] || '发票'
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
    feedback.textContent = editedDescriptions.has(name) ? '已修改本类描述。' : '根据本类材料生成的示例，可修改。'
    textarea.addEventListener('input', () => {
      categoryDescriptions.set(name, textarea.value)
      editedDescriptions.add(name)
      pendingDescriptions.delete(name)
      feedback.textContent = '已修改本类描述。'
    })
    generate.addEventListener('click', () => {
      const token = ++descriptionGeneration
      pendingDescriptions.set(name, token)
      feedback.textContent = '正在生成本类描述…'
      window.setTimeout(() => {
        if (!textarea.isConnected || pendingDescriptions.get(name) !== token) return
        const draft = descriptionDraftForCategory(category)
        textarea.value = draft
        categoryDescriptions.set(name, draft)
        editedDescriptions.delete(name)
        pendingDescriptions.delete(name)
        feedback.textContent = '本类描述已生成，可继续修改。'
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
    feedback.textContent = '生成暂不可用，可直接修改本类描述。'
  })
})
