import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { X, Printer, Download, CheckCircle2, MessageSquare, Image as ImageIcon, Copy } from 'lucide-react'
import { generateInvoiceImage, downloadInvoiceImage } from '../../utils/generateInvoiceImage'

export default function InvoiceModal({ isOpen, order, settings, product = null, products = [], autoPrint = false, onClose }) {
  const downloadTriggeredRef = useRef(false)
  const resolvedProductRef = useRef(null)
  const [invoiceData, setInvoiceData] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [imageDownloaded, setImageDownloaded] = useState(false)
  const [copyImageSuccess, setCopyImageSuccess] = useState(false)

  // Generate canvas image whenever order or settings or product changes
  useEffect(() => {
    if (!isOpen || !order) {
      setInvoiceData(null)
      setGenerating(false)
      downloadTriggeredRef.current = false
      resolvedProductRef.current = null
      return
    }

    let isMounted = true

    async function buildInvoice() {
      setGenerating(true)
      try {
        // Resolve target product
        let targetProduct = product
        if (!targetProduct && products && products.length > 0) {
          targetProduct = products.find(
            (p) =>
              (order.product_id && p.id === order.product_id) ||
              (p.name && order.product_name && p.name.trim().toLowerCase() === order.product_name.trim().toLowerCase())
          )
        }

        // Supabase query fallback if not found
        if (!targetProduct && order.product_name) {
          try {
            const { data } = await supabase
              .from('products')
              .select('*')
              .eq('name', order.product_name)
              .limit(1)
            if (data && data[0]) {
              targetProduct = data[0]
            }
          } catch (e) {
            // ignore
          }
        }

        resolvedProductRef.current = targetProduct

        const generated = await generateInvoiceImage(order, settings, targetProduct)
        if (!isMounted) return

        setInvoiceData(generated)
        setGenerating(false)

        // Automatically trigger image download on confirmation
        if (autoPrint && !downloadTriggeredRef.current && generated?.dataUrl) {
          downloadTriggeredRef.current = true
          setTimeout(() => {
            const link = document.createElement('a')
            link.href = generated.dataUrl
            link.download = generated.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setImageDownloaded(true)
            setTimeout(() => setImageDownloaded(false), 5000)
          }, 300)
        }
      } catch (err) {
        console.error('Error generating invoice image:', err)
        if (isMounted) setGenerating(false)
      }
    }

    buildInvoice()

    return () => {
      isMounted = false
    }
  }, [isOpen, order, settings, product, products, autoPrint])

  if (!isOpen || !order) return null

  // Manual download handler
  const handleDownload = async () => {
    if (invoiceData?.dataUrl && invoiceData?.filename) {
      const link = document.createElement('a')
      link.href = invoiceData.dataUrl
      link.download = invoiceData.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      await downloadInvoiceImage(order, settings, resolvedProductRef.current)
    }
    setImageDownloaded(true)
    setTimeout(() => setImageDownloaded(false), 5000)
  }

  // Native Print Handler using the clean rendered image
  const handlePrint = () => {
    if (!invoiceData?.dataUrl) {
      window.print()
      return
    }

    try {
      const printWindow = window.open('', '_blank', 'width=850,height=1050')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${invoiceData.filename}</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                body { margin: 0; padding: 10px; display: flex; justify-content: center; background: #fff; }
                img { max-width: 100%; height: auto; display: block; }
              </style>
            </head>
            <body>
              <img src="${invoiceData.dataUrl}" />
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 300);
                };
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
        return
      }
    } catch (e) {
      console.warn('Popup blocked, printing current page:', e)
    }
    window.print()
  }

  // Helper to copy invoice image to clipboard (PC / Desktop)
  const handleCopyImage = async () => {
    if (!invoiceData?.dataUrl) return
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const response = await fetch(invoiceData.dataUrl)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopyImageSuccess(true)
        setTimeout(() => setCopyImageSuccess(false), 8000)
        return true
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e)
    }
    return false
  }

  // Direct WhatsApp Share Handler with Image Support
  const handleShareWhatsapp = async () => {
    const rawPhone = (order.phone || '').replace(/\D/g, '')
    let formattedPhone = rawPhone
    if (formattedPhone.startsWith('0')) formattedPhone = '88' + formattedPhone
    else if (!formattedPhone.startsWith('88')) formattedPhone = '88' + formattedPhone

    const messageText = `Hello ${order.customer_name},\nYour order for "${order.product_name}" has been confirmed by Denim Vault BD.\nInvoice #${invoiceData?.invoiceNumber || ''}\nTotal: BDT ${order.total_price}\nPayment: Cash on Delivery.\nThank you for shopping with us!`

    // 1. Mobile Web Share API: Shares actual image file + pre-filled message directly into WhatsApp app
    if (invoiceData?.dataUrl && navigator.canShare) {
      try {
        const response = await fetch(invoiceData.dataUrl)
        const blob = await response.blob()
        const file = new File([blob], invoiceData.filename || 'Invoice.png', { type: 'image/png' })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice #${invoiceData.invoiceNumber || ''}`,
            text: messageText,
            files: [file]
          })
          return
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return // User cancelled the share sheet
        }
        console.warn('Web Share failed, using clipboard & web fallback:', shareErr)
      }
    }

    // 2. PC / Desktop: Copy image to system clipboard so user can press Ctrl+V in WhatsApp Web
    await handleCopyImage()

    // 3. Open WhatsApp chat with pre-filled message
    const textEncoded = encodeURIComponent(messageText)
    const waUrl = `https://wa.me/${formattedPhone}?text=${textEncoded}`
    window.open(waUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-100 shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* Modal Toolbar Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 font-bold">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Official Invoice Copy
              </h3>
              <p className="text-[10px] text-slate-400">
                Invoice #{invoiceData?.invoiceNumber || '1001-26'} &bull; Customer: {order.customer_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* WhatsApp Share Button with Image Support */}
            <button
              type="button"
              onClick={handleShareWhatsapp}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-3 py-2 text-xs font-bold text-emerald-700 transition-all shadow-xs cursor-pointer"
              title="Share Invoice Image & message to WhatsApp"
            >
              <MessageSquare size={14} />
              <span>WhatsApp Invoice</span>
            </button>

            {/* Copy Image Button */}
            <button
              type="button"
              onClick={handleCopyImage}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 px-3 py-2 text-xs font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
              title="Copy Invoice Image to Clipboard (for Ctrl+V in WhatsApp Web)"
            >
              <Copy size={13} />
              <span>Copy Image</span>
            </button>

            {/* Primary Download Image Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-200 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Print Invoice"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
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

        {/* Copy Image Notice Banner */}
        {copyImageSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>📋 Invoice image copied to clipboard! In WhatsApp Web, simply press <span className="bg-emerald-200/70 px-1.5 py-0.5 rounded text-emerald-950 font-mono text-[11px]">Ctrl + V</span> to attach and send.</span>
            </div>
            <button
              type="button"
              onClick={() => setCopyImageSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Download Success Banner */}
        {imageDownloaded && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-bold text-emerald-700 flex items-center gap-2 shadow-xs shrink-0">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>Official Invoice Image ({invoiceData?.filename}) has been downloaded to your device!</span>
          </div>
        )}

        {/* Mobile helper hint */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-5 py-1.5 text-[11px] font-semibold text-blue-700 flex items-center justify-between shrink-0">
          <span>💡 Tap & hold (long press) image on mobile to Save to Photos or share directly.</span>
          <span className="text-[10px] text-blue-500 font-bold">1600 × 2260 HD</span>
        </div>

        {/* Invoice Preview Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center bg-slate-200/70">
          {invoiceData?.dataUrl ? (
            <div className="w-full flex justify-center">
              <img
                src={invoiceData.dataUrl}
                alt={invoiceData.filename}
                className="w-full max-w-xl rounded-xl shadow-xl border border-slate-300 bg-white select-all"
              />
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-slate-600">Generating official invoice with item images...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
