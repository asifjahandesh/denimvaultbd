/**
 * Pure HTML5 Canvas 2D Invoice Image Generator
 * 
 * Generates an authentic, pixel-perfect, high-resolution PNG image of the
 * official Denim Vault BD invoice matching the user's template.
 * 
 * Works 100% offline, on any device (Android, iPhone, iPad, PC, Mac),
 * with ZERO external libraries, zero CDN dependencies, and zero popup blocking.
 */

// Image Loader with CORS & 3s timeout
function loadAnonymousImage(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return resolve(null)
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let timer = setTimeout(() => {
      resolve(null)
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url.trim()
  })
}

// Draw rounded rectangle helper
function drawRoundedRect(ctx, x, y, width, height, radius = 6) {
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}

// Draw cover/aspect clipped thumbnail
function drawClippedThumbnail(ctx, img, x, y, size, radius = 5) {
  if (!img) return
  ctx.save()
  drawRoundedRect(ctx, x, y, size, size, radius)
  ctx.clip()

  const imgW = img.naturalWidth || img.width || size
  const imgH = img.naturalHeight || img.height || size
  let drawW = size
  let drawH = size
  let offsetX = x
  let offsetY = y

  if (imgW > imgH) {
    drawH = size
    drawW = (imgW / imgH) * size
    offsetX = x - (drawW - size) / 2
  } else {
    drawW = size
    drawH = (imgH / imgW) * size
    offsetY = y - (drawH - size) / 2
  }

  try {
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
  } catch (e) {
    console.warn('Could not draw thumbnail on canvas:', e)
  }
  ctx.restore()

  // Border outline around thumbnail
  ctx.save()
  drawRoundedRect(ctx, x, y, size, size, radius)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

export async function generateInvoiceImage(order, settings = {}, product = null, skipImages = false) {
  if (!order) return null

  // Date formatting DD-MM-YYYY
  const orderDate = order.created_at ? new Date(order.created_at) : new Date()
  const day = String(orderDate.getDate()).padStart(2, '0')
  const month = String(orderDate.getMonth() + 1).padStart(2, '0')
  const year = orderDate.getFullYear()
  const formattedDate = `${day}-${month}-${year}`

  // Invoice Number (XXXX-YY)
  const shortId = (order.id || '').replace(/-/g, '').slice(-4).toUpperCase() || '1001'
  const yearShort = String(year).slice(-2)
  const invoiceNumber = `${shortId}-${yearShort}`

  // Customer ID
  const customerId = (order.phone || '').slice(-4) ? `CUST-${(order.phone || '').slice(-4)}` : 'CUST-101'

  // Pricing breakdown
  const totalPrice = Number(order.total_price || 0)
  const quantity = Number(order.quantity || 1)

  let deliveryCharge = 120
  let productSubtotal = Math.max(0, totalPrice - deliveryCharge)
  if (totalPrice < 120 || productSubtotal === 0) {
    deliveryCharge = 0
    productSubtotal = totalPrice
  }

  // Shop info
  const shopInfo = (settings && settings.shop_info) || {}
  const shopPhone = shopInfo.phone || '+8801920-208182'

  // 2X scale for crisp retina & print resolution (1600 x 2260)
  const scale = 2
  const W = 800
  const H = 1130

  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Outer document border
  const margin = 24
  const boxW = W - margin * 2 // 752
  const boxH = H - margin * 2 // 1082
  const boxX = margin
  const boxY = margin
  const boxRight = boxX + boxW // 776
  const boxBottom = boxY + boxH // 1106

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.strokeRect(boxX, boxY, boxW, boxH)

  // Reset lineWidth for internal table borders
  ctx.lineWidth = 1

  // ==========================================
  // SECTION 1: HEADER (y: 24 to 135)
  // ==========================================
  const headerBottomY = 135
  const headerSplitX = 460

  // Vertical divider between brand and INVOICE title
  ctx.beginPath()
  ctx.moveTo(headerSplitX, boxY)
  ctx.lineTo(headerSplitX, headerBottomY)
  ctx.stroke()

  // Left Brand Box
  ctx.fillStyle = '#1e3a8a'
  ctx.font = 'bold 20px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Denim Vault BD', boxX + 14, boxY + 28)

  ctx.fillStyle = '#000000'
  ctx.font = '11px Arial, Helvetica, sans-serif'
  ctx.fillText('Mawna, Sreepur', boxX + 14, boxY + 48)
  ctx.fillText('Gazipur - 1744', boxX + 14, boxY + 64)
  ctx.fillText(`Phone: ${shopPhone}`, boxX + 14, boxY + 80)
  ctx.fillText('Website: denimvaultbd.vercel.app', boxX + 14, boxY + 96)

  // Right INVOICE Box
  ctx.fillStyle = '#5b7fa4'
  ctx.font = 'bold 26px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('INVOICE', boxRight - 14, boxY + 34)

  // Metadata horizontal divider
  const metaStartY = boxY + 44
  ctx.beginPath()
  ctx.moveTo(headerSplitX, metaStartY)
  ctx.lineTo(boxRight, metaStartY)
  ctx.stroke()

  // Metadata 4 rows
  const metaRowH = (headerBottomY - metaStartY) / 4
  const metaSplitX = headerSplitX + 120

  const metaRows = [
    { label: 'DATE', val: formattedDate, bold: false },
    { label: 'INVOICE #', val: invoiceNumber, bold: true },
    { label: 'CUSTOMER ID', val: customerId, bold: false },
    { label: 'DUE DATE', val: 'Cash on Delivery', bold: false }
  ]

  metaRows.forEach((row, i) => {
    const rowY = metaStartY + i * metaRowH
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(headerSplitX, rowY)
      ctx.lineTo(boxRight, rowY)
      ctx.stroke()
    }

    // Label (Right aligned)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 9.5px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(row.label, metaSplitX - 8, rowY + metaRowH * 0.68)

    // Value (Centered)
    ctx.font = row.bold ? 'bold 10px Arial, Helvetica, sans-serif' : '10px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(row.val, (metaSplitX + boxRight) / 2, rowY + metaRowH * 0.68)
  })

  // Vertical line between meta label & value
  ctx.beginPath()
  ctx.moveTo(metaSplitX, metaStartY)
  ctx.lineTo(metaSplitX, headerBottomY)
  ctx.stroke()

  // Header bottom border
  ctx.beginPath()
  ctx.moveTo(boxX, headerBottomY)
  ctx.lineTo(boxRight, headerBottomY)
  ctx.stroke()

  // ==========================================
  // SECTION 2: BILL TO (y: 135 to 225)
  // ==========================================
  const billToY = headerBottomY
  const billToBarH = 20
  const billToBottomY = 225

  // Navy bar
  ctx.fillStyle = '#244082'
  ctx.fillRect(boxX, billToY, boxW, billToBarH)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('BILL TO', boxX + 12, billToY + 14)

  // Customer details rows
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 11.5px Arial, Helvetica, sans-serif'
  ctx.fillText(order.customer_name || 'Customer Name', boxX + 12, billToY + 36)

  ctx.font = '11px Arial, Helvetica, sans-serif'
  ctx.fillText(order.phone || 'Phone Number', boxX + 12, billToY + 52)

  const addr = order.address || 'Address'
  const displayAddr = addr.length > 85 ? addr.slice(0, 85) + '...' : addr
  ctx.fillText(displayAddr, boxX + 12, billToY + 68)

  ctx.fillStyle = '#444444'
  ctx.fillText('Bangladesh', boxX + 12, billToY + 84)

  // Divider line after Bill To
  ctx.beginPath()
  ctx.moveTo(boxX, billToBottomY)
  ctx.lineTo(boxRight, billToBottomY)
  ctx.stroke()

  // ==========================================
  // SECTION 3: ITEMS TABLE (y: 225 to 660)
  // ==========================================
  const tableTopY = billToBottomY
  const tableHeaderH = 22
  const tableBottomY = 660

  const colTaxedX = 550
  const colAmountX = 640

  // Table Navy Bar Header
  ctx.fillStyle = '#244082'
  ctx.fillRect(boxX, tableTopY, boxW, tableHeaderH)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10.5px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('DESCRIPTION', boxX + 12, tableTopY + 15)

  ctx.textAlign = 'center'
  ctx.fillText('TAXED', (colTaxedX + colAmountX) / 2, tableTopY + 15)

  ctx.textAlign = 'right'
  ctx.fillText('AMOUNT', boxRight - 12, tableTopY + 15)

  // Row 1: Product description & Images
  const row1Y = tableTopY + tableHeaderH

  // Parse variant items if multi-item or single item
  const variantLines = []
  if (order.product_variant) {
    if (order.product_variant.includes(' + ')) {
      order.product_variant.split(' + ').forEach((part) => variantLines.push(part.trim()))
    } else {
      variantLines.push(order.product_variant)
    }
  }

  // Extract candidate image URLs from product & order
  const candidateUrls = []
  const prodImages = []
  if (product) {
    if (product.image_urls && Array.isArray(product.image_urls)) {
      prodImages.push(...product.image_urls.filter(Boolean))
    }
    if (product.image_url && !prodImages.includes(product.image_url)) {
      prodImages.push(product.image_url)
    }
  }
  if (order.product_image && !prodImages.includes(order.product_image)) {
    prodImages.push(order.product_image)
  }

  // Check if variant lines specify specific colors
  const bnToEn = { '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9 }
  if (variantLines.length > 0 && prodImages.length > 0) {
    variantLines.forEach((line) => {
      let colorIdx = null
      const bnMatch = line.match(/কালার\s*(?:#|:)?\s*([১-৯\d]+)/i)
      if (bnMatch) {
        const raw = bnMatch[1]
        const num = bnToEn[raw] || parseInt(raw, 10)
        if (!isNaN(num) && num > 0) colorIdx = num - 1
      }
      if (colorIdx === null) {
        const enMatch = line.match(/Color\s*(?:#|:)?\s*(\d+)/i)
        if (enMatch) {
          const num = parseInt(enMatch[1], 10)
          if (!isNaN(num) && num > 0) colorIdx = num - 1
        }
      }

      if (colorIdx !== null && prodImages[colorIdx]) {
        if (!candidateUrls.includes(prodImages[colorIdx])) {
          candidateUrls.push(prodImages[colorIdx])
        }
      }
    })
  }

  // If no variant-specific color match found, use primary product image
  if (candidateUrls.length === 0 && prodImages.length > 0) {
    candidateUrls.push(prodImages[0])
  }

  // Limit to max 3 images to keep table neat
  const urlsToLoad = candidateUrls.slice(0, 3)

  let loadedImages = []
  if (!skipImages && urlsToLoad.length > 0) {
    try {
      const results = await Promise.all(urlsToLoad.map((url) => loadAnonymousImage(url, 2500)))
      loadedImages = results.filter(Boolean)
    } catch (err) {
      console.warn('Error loading invoice product images:', err)
      loadedImages = []
    }
  }

  const hasThumbnails = loadedImages.length > 0
  const thumbSize = loadedImages.length > 1 ? 42 : 46
  const thumbGap = 5
  const thumbAreaW = hasThumbnails ? loadedImages.length * (thumbSize + thumbGap) - thumbGap : 0
  const textStartX = hasThumbnails ? boxX + 12 + thumbAreaW + 10 : boxX + 12

  const minRowH = hasThumbnails ? thumbSize + 14 : 23
  const textH = 20 + variantLines.length * 15
  const row1H = Math.max(minRowH, textH)

  // Draw thumbnails
  if (hasThumbnails) {
    const thumbY = row1Y + Math.round((row1H - thumbSize) / 2)
    loadedImages.forEach((img, idx) => {
      const imgX = boxX + 12 + idx * (thumbSize + thumbGap)
      drawClippedThumbnail(ctx, img, imgX, thumbY, thumbSize, 5)
    })
  }

  // Draw product title & quantity
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 11px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${order.product_name} × ${quantity}`, textStartX, row1Y + 16)

  // Draw variant details
  if (variantLines.length > 0) {
    ctx.font = '9.5px Arial, Helvetica, sans-serif'
    ctx.fillStyle = '#444444'
    variantLines.forEach((vLine, idx) => {
      ctx.fillText(vLine, textStartX, row1Y + 31 + idx * 14)
    })
  }

  ctx.font = '11px Arial, Helvetica, sans-serif'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.fillText('-', (colTaxedX + colAmountX) / 2, row1Y + 16)

  ctx.textAlign = 'right'
  ctx.fillText(productSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), boxRight - 12, row1Y + 16)

  ctx.beginPath()
  ctx.moveTo(boxX, row1Y + row1H)
  ctx.lineTo(boxRight, row1Y + row1H)
  ctx.stroke()

  // Row 2: Delivery Charge
  const rowH = 23
  const row2Y = row1Y + row1H
  ctx.textAlign = 'left'
  const deliveryLabel = `Delivery Charge ${deliveryCharge === 0 ? '(Free Delivery Promotion)' : '(Standard Shipping)'}`
  ctx.fillText(deliveryLabel, boxX + 12, row2Y + 16)

  ctx.textAlign = 'center'
  ctx.fillText('-', (colTaxedX + colAmountX) / 2, row2Y + 16)

  ctx.textAlign = 'right'
  ctx.fillText(deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), boxRight - 12, row2Y + 16)

  ctx.beginPath()
  ctx.moveTo(boxX, row2Y + rowH)
  ctx.lineTo(boxRight, row2Y + rowH)
  ctx.stroke()

  let currentTableY = row2Y + rowH

  // Row 3: Customer Note if any
  if (order.notes) {
    ctx.textAlign = 'left'
    ctx.font = 'italic 10px Arial, Helvetica, sans-serif'
    ctx.fillStyle = '#333333'
    const noteText = `Customer Note: "${order.notes}"`
    ctx.fillText(noteText.slice(0, 75), boxX + 12, currentTableY + 16)

    ctx.textAlign = 'center'
    ctx.fillText('-', (colTaxedX + colAmountX) / 2, currentTableY + 16)

    ctx.textAlign = 'right'
    ctx.fillText('0.00', boxRight - 12, currentTableY + 16)

    currentTableY += rowH
    ctx.beginPath()
    ctx.moveTo(boxX, currentTableY)
    ctx.lineTo(boxRight, currentTableY)
    ctx.stroke()
  }

  // Draw remaining blank spreadsheet lines
  while (currentTableY + 19 <= tableBottomY) {
    currentTableY += 19
    ctx.beginPath()
    ctx.moveTo(boxX, currentTableY)
    ctx.lineTo(boxRight, currentTableY)
    ctx.stroke()
  }

  // Draw vertical column lines in table
  ctx.beginPath()
  ctx.moveTo(colTaxedX, tableTopY)
  ctx.lineTo(colTaxedX, tableBottomY)
  ctx.moveTo(colAmountX, tableTopY)
  ctx.lineTo(colAmountX, tableBottomY)
  ctx.stroke()

  // Table bottom border
  ctx.beginPath()
  ctx.moveTo(boxX, tableBottomY)
  ctx.lineTo(boxRight, tableBottomY)
  ctx.stroke()

  // ==========================================
  // SECTION 4: COMMENTS & TOTALS (y: 660 to 830)
  // ==========================================
  const section4Y = tableBottomY
  const section4BottomY = 830
  const commentsSplitX = 470

  // Vertical divider between comments and totals
  ctx.beginPath()
  ctx.moveTo(commentsSplitX, section4Y)
  ctx.lineTo(commentsSplitX, section4BottomY)
  ctx.stroke()

  // Left: OTHER COMMENTS
  ctx.fillStyle = '#244082'
  ctx.fillRect(boxX, section4Y, commentsSplitX - boxX, 20)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10.5px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('OTHER COMMENTS', boxX + 12, section4Y + 14)

  ctx.fillStyle = '#111111'
  ctx.font = '10px Arial, Helvetica, sans-serif'
  const commentLines = [
    '1. Payment Method: Cash on Delivery (COD).',
    '2. Please check product in front of delivery agent before payment.',
    '3. 7 days exchange policy available for size or defect issues.',
    '4. Authentic Denim Vault BD merchandise.',
    `5. For customer support contact: ${shopPhone}`
  ]

  commentLines.forEach((cLine, idx) => {
    ctx.fillText(cLine, boxX + 12, section4Y + 38 + idx * 22)
  })

  // Right: Totals Table
  const calcRowH = (section4BottomY - section4Y) / 6
  const calcSplitX = commentsSplitX + 115

  const calcRows = [
    { label: 'Subtotal', val: productSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), isTotal: false },
    { label: 'Taxable', val: '0.00', isTotal: false },
    { label: 'Tax rate', val: '0.00%', isTotal: false },
    { label: 'Tax due', val: '0.00', isTotal: false },
    { label: 'Other (Delivery)', val: deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), isTotal: false },
    { label: 'TOTAL BDT', val: `BDT ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, isTotal: true }
  ]

  calcRows.forEach((cRow, idx) => {
    const cY = section4Y + idx * calcRowH

    if (cRow.isTotal) {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(commentsSplitX, cY, boxRight - commentsSplitX, calcRowH)

      ctx.beginPath()
      ctx.lineWidth = 2
      ctx.moveTo(commentsSplitX, cY)
      ctx.lineTo(boxRight, cY)
      ctx.stroke()
      ctx.lineWidth = 1
    } else if (idx > 0) {
      ctx.beginPath()
      ctx.moveTo(commentsSplitX, cY)
      ctx.lineTo(boxRight, cY)
      ctx.stroke()
    }

    // Label
    ctx.fillStyle = '#000000'
    ctx.font = cRow.isTotal ? 'bold 11px Arial, Helvetica, sans-serif' : '10px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(cRow.label, commentsSplitX + 10, cY + calcRowH * 0.68)

    // Value
    ctx.fillStyle = cRow.isTotal ? '#1e3a8a' : '#000000'
    ctx.font = cRow.isTotal ? 'bold 12px Arial, Helvetica, sans-serif' : '10px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(cRow.val, boxRight - 12, cY + calcRowH * 0.68)
  })

  // Vertical line inside Totals table
  ctx.beginPath()
  ctx.moveTo(calcSplitX, section4Y)
  ctx.lineTo(calcSplitX, section4BottomY)
  ctx.stroke()

  // Divider after Section 4
  ctx.beginPath()
  ctx.moveTo(boxX, section4BottomY)
  ctx.lineTo(boxRight, section4BottomY)
  ctx.stroke()

  // ==========================================
  // SECTION 5: PAYMENT NOTES & THANK YOU (y: 830 to 1045)
  // ==========================================
  const note1Y = 885
  const note2Y = 945
  const note3Y = 1045

  // Make checks payable to
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 10.5px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Make all checks payable to', W / 2, section4BottomY + 22)

  ctx.fillStyle = '#1e3a8a'
  ctx.font = 'bold 12px Arial, Helvetica, sans-serif'
  ctx.fillText('Denim Vault BD', W / 2, section4BottomY + 38)

  ctx.beginPath()
  ctx.moveTo(boxX, note1Y)
  ctx.lineTo(boxRight, note1Y)
  ctx.stroke()

  // Contact questions
  ctx.fillStyle = '#444444'
  ctx.font = '10px Arial, Helvetica, sans-serif'
  ctx.fillText('If you have any questions about this invoice, please contact:', W / 2, note1Y + 22)

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 11px Arial, Helvetica, sans-serif'
  ctx.fillText(`DenimVaultBD - ${shopPhone}`, W / 2, note1Y + 40)

  ctx.beginPath()
  ctx.moveTo(boxX, note2Y)
  ctx.lineTo(boxRight, note2Y)
  ctx.stroke()

  // Thank you banner
  ctx.fillStyle = '#111111'
  ctx.font = 'italic bold 16px Arial, Helvetica, sans-serif'
  ctx.fillText('Thank You For Shopping With Us!', W / 2, note2Y + 58)

  ctx.beginPath()
  ctx.moveTo(boxX, note3Y)
  ctx.lineTo(boxRight, note3Y)
  ctx.stroke()

  // ==========================================
  // SECTION 6: BOTTOM FOOTER (y: 1045 to 1106)
  // ==========================================
  const footerSplitX = W / 2

  ctx.beginPath()
  ctx.moveTo(footerSplitX, note3Y)
  ctx.lineTo(footerSplitX, boxBottom)
  ctx.stroke()

  ctx.fillStyle = '#000000'
  ctx.font = '9.5px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('https://www.denimvaultbd.vercel.app', boxX + 12, note3Y + 23)

  ctx.textAlign = 'right'
  ctx.fillText('Web Template by Md. Asif Jahan', boxRight - 12, note3Y + 23)

  // Output image data safely
  let dataUrl = ''
  try {
    dataUrl = canvas.toDataURL('image/png')
  } catch (canvasErr) {
    console.warn('Canvas toDataURL security error (tainted image). Redrawing without images:', canvasErr)
    if (!skipImages) {
      return generateInvoiceImage(order, settings, product, true /* skipImages */)
    }
  }

  const filename = `Invoice-${invoiceNumber}.png`

  return {
    dataUrl,
    filename,
    invoiceNumber,
    customerId,
    formattedDate
  }
}

/**
 * Downloads the official Invoice image directly to user's device
 */
export async function downloadInvoiceImage(order, settings = {}, product = null) {
  const invoice = await generateInvoiceImage(order, settings, product)
  if (!invoice || !invoice.dataUrl) return null

  const link = document.createElement('a')
  link.href = invoice.dataUrl
  link.download = invoice.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return invoice
}
