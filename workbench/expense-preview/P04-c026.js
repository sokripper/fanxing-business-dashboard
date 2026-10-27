// Synthetic design interaction only. No API, invoice bytes, or real approval.
const c026Text = document.getElementById('c026-description-text')
const c026Feedback = document.getElementById('c026-description-feedback')
let c026Edited = false
let c026Generation = 0
function resetDescriptionDraft() {
  c026Generation += 1
  c026Edited = false
  c026Text.value = ''
  c026Feedback.textContent = '演示稿：系统根据当前各类票据生成初稿，您可以编辑。'
}
function descriptionDraft() {
  const groups = materialGroups()
  const categories = categoryGroups(groups).map(group => `${group.name}${money(group.amountCents)}`).join('、')
  const ride = groups.find(group => group.code === 'RIDE')
  return `本次报销包含${categories}，合计${money(reviewAmountCents())}。${ride ? `网约车${ride.itineraries.length}张行程单与${ride.invoices.length}张发票按整组金额核对，行程单不重复计入。` : ''}`
}
function syncDescriptionDraft() {
  if (c026Edited) return
  c026Text.value = descriptionDraft()
  c026Feedback.textContent = '合成初稿已按当前费用类别生成，可继续编辑；不代表真实 OCR 结果。'
}
c026Text.addEventListener('input', () => { c026Edited = true; c026Feedback.textContent = '已人工修改。确认前将先保存文本并重新预检。' })
document.getElementById('c026-generate').addEventListener('click', () => {
  const generation = ++c026Generation
  c026Feedback.textContent = '正在生成文字初稿；材料事实和金额不受影响。'
  window.setTimeout(() => {
    if (generation !== c026Generation || c026Edited) return
    c026Text.value = descriptionDraft()
    c026Feedback.textContent = '初稿已生成，可继续编辑。此为合成演示文字，不代表真实 OCR。'
  }, 600)
})
document.getElementById('c026-mismatch-demo').addEventListener('click', () => {
  demo('ready')
  const rideInvoice = model.files.find(file => file.materialKind === 'RIDE' && file.role === 'invoice')
  rideInvoice.amountCents += 1200
  renderReview('ready')
})
document.getElementById('c026-generate-fail-demo').addEventListener('click', () => {
  demo('ready')
  c026Generation++
  c026Feedback.textContent = '文字生成暂不可用。您可手动填写，也可留空；已合格材料仍可继续。'
})
