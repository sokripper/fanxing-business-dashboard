// 原型文件没有真实附件；每张示例票面由该文件的 ID、名称及金额生成。
let invoicePreviewId = null
let invoicePreviewZoom = 1
let invoicePreviewOpener = null
const invoicePreviewPane = $('invoice-preview-pane')
const categoryAdjustmentDialog = classificationOverlay.querySelector('[role="dialog"]')
function resetInvoicePreview() {
  invoicePreviewPane.hidden = true
  categoryAdjustmentDialog.classList.remove('has-invoice-preview')
  $('invoice-preview-image').removeAttribute('src')
  invoicePreviewId = null
  invoicePreviewZoom = 1
}
function bindInvoicePreviewLinks() {
  document.querySelectorAll('[data-preview-invoice]').forEach(button => {
    const active = button.dataset.previewInvoice === invoicePreviewId
    button.closest('[data-invoice-card]').classList.toggle('invoice-preview-active', active)
    button.setAttribute('aria-pressed', String(active))
    button.onclick = () => {
      invoicePreviewOpener = button
      openInvoicePreview(button.dataset.previewInvoice)
    }
  })
}
function invoicePreviewSvg(file, index) {
  const dining = file.materialKind === 'DINING'
  const content = dining ? '*餐饮服务*餐费' : '*运输服务*客运服务费'
  const seller = dining ? `示例餐饮服务商 ${index + 1}` : `示例出行服务商 ${index + 1}`
  const number = `DEMO-${String(file.id).padStart(8, '0')}`
  const amount = money(file.amountCents)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
    <rect width="960" height="640" fill="white"/>
    <g font-family="PingFang SC, Microsoft YaHei, sans-serif">
      <text x="480" y="68" text-anchor="middle" fill="#8b4c65" font-size="29" font-weight="600">电子发票 · 演示票面</text>
      <path d="M55 89H905 M55 95H905" stroke="#b17d91"/>
      <text x="57" y="130" fill="#75677a" font-size="18">发票号码：${escapeHtml(number)}</text>
      <text x="660" y="130" fill="#75677a" font-size="18">开票日期：2026年10月13日</text>
      <g fill="none" stroke="#c7a7b4"><rect x="55" y="153" width="850" height="350"/><path d="M55 259H905 M55 314H905 M55 446H905 M480 153V259 M650 259V446 M790 259V446"/></g>
      <g fill="#4f4753" font-size="19"><text x="76" y="188">购买方：演示付款公司</text><text x="76" y="229">纳税人识别号：演示数据</text><text x="500" y="188">销售方：${escapeHtml(seller)}</text><text x="500" y="229">纳税人识别号：演示数据</text>
      <text x="76" y="294">项目名称</text><text x="675" y="294">数量</text><text x="815" y="294">金额</text>
      <text x="76" y="367">${content}</text><text x="695" y="367">1</text><text x="883" y="367" text-anchor="end">${escapeHtml(amount)}</text>
      <text x="76" y="483">价税合计</text><text x="882" y="484" text-anchor="end" font-size="25" font-weight="600">${escapeHtml(amount)}</text></g>
      <text x="76" y="548" fill="#68778a" font-size="18">附件：${escapeHtml(file.name)}</text>
      <text x="480" y="600" text-anchor="middle" fill="#a0a9b7" font-size="16">合成演示票据 · 非真实发票</text>
      <text x="480" y="398" transform="rotate(-18 480 398)" text-anchor="middle" fill="#b17d91" opacity=".12" font-size="95" font-weight="600">原型示例</text>
    </g></svg>`
}
function invoicePreviewSource(file, index) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(invoicePreviewSvg(file, index))
}
function openInvoicePreview(id) {
  if (!classificationDraft) return
  const index = classificationDraft.files.findIndex(file => String(file.id) === String(id))
  if (index < 0) return
  const file = classificationDraft.files[index]
  invoicePreviewId = String(file.id)
  invoicePreviewZoom = 1
  invoicePreviewPane.hidden = false
  categoryAdjustmentDialog.classList.add('has-invoice-preview')
  $('invoice-preview-name').textContent = file.name
  $('invoice-preview-position').textContent = `${index + 1} / ${classificationDraft.files.length}`
  $('invoice-preview-previous').disabled = index === 0
  $('invoice-preview-next').disabled = index === classificationDraft.files.length - 1
  $('invoice-preview-image').alt = `${file.name}，票面金额${money(file.amountCents)}，合成演示票据`
  $('invoice-preview-image').src = invoicePreviewSource(file, index)
  updateInvoicePreviewZoom()
  $('invoice-preview-viewport').scrollTop = 0
  $('invoice-preview-viewport').scrollLeft = 0
  bindInvoicePreviewLinks()
}
function updateInvoicePreviewZoom() {
  $('invoice-preview-image').style.width = `${Math.round(invoicePreviewZoom * 100)}%`
  $('invoice-preview-scale').textContent = `${Math.round(invoicePreviewZoom * 100)}%`
  $('invoice-preview-smaller').disabled = invoicePreviewZoom <= 1
  $('invoice-preview-larger').disabled = invoicePreviewZoom >= 2
}
function moveInvoicePreview(direction) {
  if (!classificationDraft) return
  const index = classificationDraft.files.findIndex(file => String(file.id) === invoicePreviewId)
  const file = classificationDraft.files[index + direction]
  if (file) openInvoicePreview(file.id)
}
$('invoice-preview-previous').onclick = () => moveInvoicePreview(-1)
$('invoice-preview-next').onclick = () => moveInvoicePreview(1)
$('invoice-preview-smaller').onclick = () => { invoicePreviewZoom = Math.max(1, invoicePreviewZoom - .25); updateInvoicePreviewZoom() }
$('invoice-preview-larger').onclick = () => { invoicePreviewZoom = Math.min(2, invoicePreviewZoom + .25); updateInvoicePreviewZoom() }
$('invoice-preview-close').onclick = () => {
  resetInvoicePreview()
  bindInvoicePreviewLinks()
  if (invoicePreviewOpener?.isConnected) invoicePreviewOpener.focus()
}
