import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { X, Printer, Download, CheckCircle2, MessageSquare, Image as ImageIcon } from 'lucide-react'
import { generateInvoiceImage, downloadInvoiceImage } from '../../utils/generateInvoiceImage'

export default function InvoiceModal({ isOpen, order, settings, product = null, products = [], autoPrint = false, onClose }) {
  const downloadTriggeredRef = useRef(false)
  const resolvedProductRef = useRef(null)
  const [invoiceData, setInvoiceData] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [imageDownloaded, setImageDownloaded] = useState(false)

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

  // Direct WhatsApp link to customer
  const getWhatsappLink = () => {
    const rawPhone = (order.phone || '').replace(/\D/g, '')
    let formattedPhone = rawPhone
    if (formattedPhone.startsWith('0')) formattedPhone = '88' + formattedPhone
    else if (!formattedPhone.startsWith('88')) formattedPhone = '88' + formattedPhone

    const text = encodeURIComponent(
      `Hello ${order.customer_name},\nYour order for "${order.product_name}" has been confirmed by Denim Vault BD.\nInvoice #${invoiceData?.invoiceNumber || ''}\nTotal: BDT ${order.total_price}\nPayment: Cash on Delivery.\nThank you for shopping with us!`
    )
    return `https://wa.me/${formattedPhone}?text=${text}`
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

          <div className="flex items-center gap-2">
            {/* Primary Download Image Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-200 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Download Invoice Image</span>
            </button>

            {/* WhatsApp Share Button */}
            <a
              href={getWhatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors shadow-xs"
              title="Message customer on WhatsApp"
            >
              <MessageSquare size={13} />
              <span>WhatsApp</span>
            </a>

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
