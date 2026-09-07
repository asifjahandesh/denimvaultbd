import React, { useState, useEffect, useRef } from 'react'
import { X, Printer, Download, CheckCircle2, Loader2, FileCode, Check, ExternalLink, AlertCircle } from 'lucide-react'

// Robust dynamic loader for html2pdf.js
const ensureHtml2Pdf = async () => {
  if (typeof window !== 'undefined' && window.html2pdf) {
    return window.html2pdf
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => {
      if (window.html2pdf) resolve(window.html2pdf)
      else reject(new Error('html2pdf loaded but window.html2pdf is undefined'))
    }
    script.onerror = () => {
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
      fallbackScript.onload = () => {
        if (window.html2pdf) resolve(window.html2pdf)
        else reject(new Error('Fallback html2pdf failed'))
      }
      fallbackScript.onerror = () => reject(new Error('Failed to load html2pdf from all CDNs'))
      document.head.appendChild(fallbackScript)
    }
    document.head.appendChild(script)
  })
}

export default function InvoiceModal({ isOpen, order, settings, autoPrint = false, onClose }) {
  const printTriggeredRef = useRef(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)
  const [pdfError, setPdfError] = useState(null)

  if (!isOpen || !order) return null

  // Format Date DD-MM-YYYY
  const orderDate = order.created_at ? new Date(order.created_at) : new Date()
  const day = String(orderDate.getDate()).padStart(2, '0')
  const month = String(orderDate.getMonth() + 1).padStart(2, '0')
  const year = orderDate.getFullYear()
  const formattedDate = `${day}-${month}-${year}`

  // Invoice Number (e.g. 1042-26 from order ID and year)
  const shortId = (order.id || '').replace(/-/g, '').slice(-4).toUpperCase() || '1001'
  const yearShort = String(year).slice(-2)
  const invoiceNumber = `${shortId}-${yearShort}`

  // Customer ID
  const customerId = (order.phone || '').slice(-4) ? `CUST-${(order.phone || '').slice(-4)}` : 'CUST-101'

  // Calculate pricing breakdown
  const totalPrice = Number(order.total_price || 0)
  const quantity = Number(order.quantity || 1)

  // Delivery charge calculation
  let deliveryCharge = 120
  let productSubtotal = Math.max(0, totalPrice - deliveryCharge)
  if (totalPrice < 120 || productSubtotal === 0) {
    deliveryCharge = 0
    productSubtotal = totalPrice
  }

  // Shop Info fallback
  const shopInfo = (settings && settings.shop_info) || {}
  const shopPhone = shopInfo.phone || '+8801920-208182'

  // Generate CSS string for printing and visual preview
  const invoiceCss = `
    .inv-box {
      width: 780px;
      max-width: 100%;
      margin: 0 auto;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      border: 2px solid #000000;
      box-sizing: border-box;
    }
    .inv-table {
      width: 100%;
      border-collapse: collapse;
    }
    .inv-table td, .inv-table th {
      border: 1px solid #000000;
      padding: 3px 6px;
      vertical-align: middle;
    }
    .inv-header-title {
      font-size: 26px;
      font-weight: 800;
      color: #5b7fa4;
      letter-spacing: 2px;
      text-align: right;
      padding-right: 12px;
    }
    .inv-navy-bar {
      background-color: #244082 !important;
      color: #ffffff !important;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10.5px;
      padding: 4px 8px;
    }
    .inv-bold {
      font-weight: bold;
    }
    .inv-text-center {
      text-align: center;
    }
    .inv-text-right {
      text-align: right;
    }
    .inv-blank-row td {
      height: 18px;
      border: 1px solid #000000;
    }

    /* Clean, standalone print styles across PC & Mobile */
    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body * {
        visibility: hidden;
      }
      #invoice-document-sheet,
      #invoice-document-sheet * {
        visibility: visible;
      }
      #invoice-document-sheet {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: 2px solid #000000 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `

  // Primary Action: Generate and download authentic PDF file
  const handleDownloadPdf = async () => {
    const element = document.getElementById('invoice-document-sheet')
    if (!element) return

    setIsGeneratingPdf(true)
    setPdfError(null)

    try {
      const html2pdfLib = await ensureHtml2Pdf()
      if (!html2pdfLib) throw new Error('html2pdf library could not be loaded')

      const opt = {
        margin: [4, 4, 4, 4],
        filename: `Invoice-${invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await html2pdfLib().set(opt).from(element).save()
      setPdfSuccess(true)
      setTimeout(() => setPdfSuccess(false), 5000)
    } catch (err) {
      console.error('PDF generation error:', err)
      setPdfError('PDF library download was blocked by browser. Opening print preview instead...')
      handlePrintInNewWindow()
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Standalone Print Window: bypasses all dashboard CSS and overflow issues
  const handlePrintInNewWindow = () => {
    const content = document.getElementById('invoice-document-sheet')
    if (!content) {
      try { window.print() } catch (e) {}
      return
    }

    try {
      const printWindow = window.open('', '_blank', 'width=850,height=1050')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice-${invoiceNumber}</title>
              <meta charset="utf-8" />
              <style>
                @page { size: A4 portrait; margin: 6mm 8mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background: #fff; padding: 8px; display: flex; justify-content: center; }
                ${invoiceCss}
              </style>
            </head>
            <body>
              ${content.outerHTML}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 350);
                };
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
        return
      }
    } catch (e) {
      console.warn('Popup blocked, using in-window print:', e)
    }

    try {
      window.print()
    } catch (err) {
      console.error('Print trigger error:', err)
    }
  }

  // Auto-generate & download PDF upon confirmation
  useEffect(() => {
    if (autoPrint && !printTriggeredRef.current) {
      printTriggeredRef.current = true
      const timer = setTimeout(() => {
        handleDownloadPdf()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  // Download raw HTML copy as backup
  const handleDownloadHtml = () => {
    const content = document.getElementById('invoice-document-sheet')
    if (!content) return

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice-${invoiceNumber}</title>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${invoiceCss}
  </style>
</head>
<body style="display: flex; justify-content: center; padding: 10px; background: #fff;">
  ${content.outerHTML}
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice-${invoiceNumber}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div 
      id="invoice-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <style>{invoiceCss}</style>

      <div 
        id="invoice-modal-card"
        className="relative w-full max-w-4xl rounded-3xl bg-slate-100 shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col"
      >
        
        {/* Modal Toolbar Header */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 font-bold">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Official PDF Invoice
              </h3>
              <p className="text-[10px] text-slate-400">
                Invoice #{invoiceNumber} &bull; Customer: {order.customer_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Download PDF */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-200 transition-all cursor-pointer disabled:opacity-60"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF Invoice</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrintInNewWindow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Print or Save via Browser Dialog"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* HTML Backup */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              title="Download HTML backup"
            >
              <FileCode size={13} />
              <span>HTML</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ml-1 cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic Notification Banners */}
        <div className="no-print px-5 pt-3">
          {isGeneratingPdf && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 flex items-center gap-2 shadow-xs animate-pulse">
              <Loader2 size={15} className="animate-spin text-blue-600 shrink-0" />
              <span>Generating official PDF copy (Invoice-{invoiceNumber}.pdf)...</span>
            </div>
          )}
          {pdfSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 flex items-center gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>Official PDF Invoice downloaded successfully! Saved to your Downloads folder.</span>
            </div>
          )}
          {pdfError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 flex items-center gap-2 shadow-xs">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>{pdfError}</span>
            </div>
          )}
        </div>

        {/* Invoice Preview Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-slate-200/60">
          <div id="printable-invoice-content" className="w-full flex justify-center">
            
            <div id="invoice-document-sheet" className="inv-box shadow-md">
              {/* Top Header Grid */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    {/* Brand Box (Top Left) */}
                    <td style={{ width: '58%', padding: '8px 10px', borderRight: '1px solid #000' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
                        Denim Vault BD
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#000', lineHeight: '1.4' }}>
                        <div>Mawna, Sreepur</div>
                        <div>Gazipur - 1744</div>
                        <div>Phone: {shopPhone}</div>
                        <div>Website: denimvaultbd.vercel.app</div>
                      </div>
                    </td>

                    {/* INVOICE Title & Metadata (Top Right) */}
                    <td style={{ width: '42%', padding: '0', verticalAlign: 'top' }}>
                      <div style={{ padding: '8px 10px 4px 10px' }} className="inv-header-title">
                        INVOICE
                      </div>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '48%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5px' }}>
                              DATE
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'center', fontSize: '9.5px' }}>
                              {formattedDate}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5px' }}>
                              INVOICE #
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'center', fontSize: '9.5px', fontWeight: 'bold' }}>
                              {invoiceNumber}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5px' }}>
                              CUSTOMER ID
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '2px 6px', textAlign: 'center', fontSize: '9.5px' }}>
                              {customerId}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderRight: '1px solid #000', padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5px' }}>
                              DUE DATE
                            </td>
                            <td style={{ padding: '2px 6px', textAlign: 'center', fontSize: '9.5px' }}>
                              Cash on Delivery
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* BILL TO Section */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    <td colSpan={2} className="inv-navy-bar">
                      BILL TO
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '3px 8px', fontWeight: 'bold', fontSize: '11px' }}>
                      {order.customer_name || 'Customer Name'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '3px 8px', fontSize: '10.5px' }}>
                      {order.phone || 'Phone Number'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '3px 8px', fontSize: '10.5px' }}>
                      {order.address || 'Address'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '3px 8px', fontSize: '10.5px', color: '#444' }}>
                      Bangladesh
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Items Table */}
              <table className="inv-table">
                <thead>
                  <tr className="inv-navy-bar">
                    <th style={{ width: '68%', textAlign: 'left', padding: '4px 8px' }}>DESCRIPTION</th>
                    <th style={{ width: '12%', textAlign: 'center', padding: '4px 4px' }}>TAXED</th>
                    <th style={{ width: '20%', textAlign: 'right', padding: '4px 8px' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Item 1: Main Product */}
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>
                      {order.product_name}
                      {order.product_variant ? ` (Variant: ${order.product_variant})` : ''} &times; {quantity}
                    </td>
                    <td className="inv-text-center">-</td>
                    <td className="inv-text-right">
                      {productSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Item 2: Delivery Charge */}
                  <tr>
                    <td style={{ padding: '4px 8px' }}>
                      Delivery Charge {deliveryCharge === 0 ? '(Free Delivery Promotion)' : '(Standard Shipping)'}
                    </td>
                    <td className="inv-text-center">-</td>
                    <td className="inv-text-right">
                      {deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Item 3 (Notes / Instructions if any) */}
                  {order.notes ? (
                    <tr>
                      <td style={{ padding: '4px 8px', fontStyle: 'italic', color: '#333' }}>
                        Customer Note: "{order.notes}"
                      </td>
                      <td className="inv-text-center">-</td>
                      <td className="inv-text-right">0.00</td>
                    </tr>
                  ) : null}

                  {/* Spreadsheet Grid Lines (matching template) */}
                  {[...Array(order.notes ? 12 : 13)].map((_, idx) => (
                    <tr key={idx} className="inv-blank-row">
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom Comments & Calculations Grid */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    {/* Left: OTHER COMMENTS */}
                    <td style={{ width: '60%', verticalAlign: 'top', padding: 0 }}>
                      <div className="inv-navy-bar">
                        OTHER COMMENTS
                      </div>
                      <div style={{ padding: '6px 8px', fontSize: '10px', color: '#111', lineHeight: '1.6' }}>
                        <div>1. Payment Method: Cash on Delivery (COD).</div>
                        <div>2. Please check product in front of the delivery agent before payment.</div>
                        <div>3. 7 days exchange policy available for size or defect issues.</div>
                        <div>4. Authentic Denim Vault BD merchandise.</div>
                        <div>5. For customer support contact: {shopPhone}</div>
                      </div>
                    </td>

                    {/* Right: Calculations */}
                    <td style={{ width: '40%', padding: 0, verticalAlign: 'top' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 6px', fontSize: '10px' }}>
                              Subtotal
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: '10px' }}>
                              {productSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 6px', fontSize: '10px' }}>
                              Taxable
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: '10px' }}>
                              0.00
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 6px', fontSize: '10px' }}>
                              Tax rate
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: '10px' }}>
                              0.00%
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 6px', fontSize: '10px' }}>
                              Tax due
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: '10px' }}>
                              0.00
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 6px', fontSize: '10px' }}>
                              Other (Delivery)
                            </td>
                            <td style={{ borderBottom: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: '10px' }}>
                              {deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                            <td style={{ borderTop: '2px solid #000', borderRight: '1px solid #000', padding: '4px 6px', fontSize: '11px' }}>
                              TOTAL BDT
                            </td>
                            <td style={{ borderTop: '2px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: '11px', color: '#1e3a8a' }}>
                              BDT {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Notes & Contact Section */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '5px 8px', fontSize: '10px', color: '#333' }}>
                      <div style={{ fontWeight: 'bold' }}>Make all checks payable to</div>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e3a8a' }}>Denim Vault BD</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '4px 8px', fontSize: '10px', color: '#444' }}>
                      If you have any questions about this invoice, please contact:
                      <div style={{ fontWeight: 'bold', color: '#000' }}>DenimVaultBD - {shopPhone}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '7px 8px', fontSize: '13px', fontStyle: 'italic', fontWeight: 'bold', color: '#111' }}>
                      Thank You For Shopping With Us!
                    </td>
                  </tr>
                  {/* Bottom line: Website link & author attribution */}
                  <tr style={{ borderTop: '1px solid #000', fontSize: '9px' }}>
                    <td style={{ width: '50%', padding: '3px 8px', borderRight: '1px solid #000' }}>
                      <a href="https://www.denimvaultbd.vercel.app" style={{ color: '#000', textDecoration: 'underline' }}>
                        https://www.denimvaultbd.vercel.app
                      </a>
                    </td>
                    <td style={{ width: '50%', textAlign: 'right', padding: '3px 8px' }}>
                      Web Template by Md. Asif Jahan
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
