// Synthetic design interaction only. No API, invoice bytes, or real approval.
const c026Text = document.getElementById('c026-description-text')
const c026Feedback = document.getElementById('c026-description-feedback')
let c026Edited = false
let c026Generation = 0
c026Text.addEventListener('input', () => { c026Edited = true; c026Feedback.textContent = '已人工修改。确认前将先保存文本并重新预检。' })
document.getElementById('c026-generate').addEventListener('click', () => {
  const generation = ++c026Generation
  c026Feedback.textContent = '正在生成文字初稿；材料事实和金额不受影响。'
  window.setTimeout(() => {
    if (generation !== c026Generation || c026Edited) return
    c026Text.value = '本次为网约车出行费用，相关行程单与发票金额一致。'
    c026Feedback.textContent = '初稿已生成，可继续编辑。此为合成演示文字，不代表真实 OCR。'
  }, 600)
})
document.getElementById('c026-mismatch-demo').addEventListener('click', () => {
  demo('ready')
  const card = document.querySelector('.c026-trip')
  card.classList.add('mismatch')
  document.getElementById('c026-trip-status').textContent = '金额不一致 · 暂不能提交'
  document.getElementById('c026-difference').textContent = '¥ 12.00'
  document.getElementById('review-title').textContent = '需核对网约车材料'
  document.getElementById('submit-button').disabled = true
})
document.getElementById('c026-generate-fail-demo').addEventListener('click', () => {
  demo('ready')
  c026Generation++
  c026Feedback.textContent = '文字生成暂不可用。您可手动填写，也可留空；已合格材料仍可继续。'
})
