import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json()
    console.log('PDF generation requested for session:', session_id)

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get active items sorted by sort_order
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    console.log('Items query result:', { itemCount: items?.length, error })

    if (error) {
      console.error('Database error fetching items:', error)
      throw error
    }

    if (!items || items.length === 0) {
      console.log('No items found - returning error')
      return NextResponse.json({ 
        error: 'No items found. Please add items in the admin page first.' 
      }, { status: 400 })
    }

    // Group items by location
    console.log('Grouping items by location...')
    const freezerItems = items?.filter(i => i.is_freezer_item && i.location === 'freezer') || []
    const serviceItems = items?.filter(i => i.location === 'fridge') || []
    const dryItems = items?.filter(i => i.location === 'dry') || []
    console.log('Item groups:', { freezer: freezerItems.length, service: serviceItems.length, dry: dryItems.length })

    // Generate QR code
    console.log('Generating QR code...')
    const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ops/stock-checking/${session_id}/scan`
    console.log('Scan URL:', scanUrl)
    const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 150 })
    console.log('QR code generated successfully')

    // Create PDF
    console.log('Creating PDF document...')
    let doc
    try {
      doc = new PDFDocument({ size: 'A4', margin: 40 })
      console.log('PDFDocument created successfully')
    } catch (err) {
      console.error('Error creating PDFDocument:', err)
      throw new Error(`Failed to create PDF document: ${err instanceof Error ? err.message : String(err)}`)
    }
    
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    console.log('PDF data handler attached')

    // Header
    console.log('Adding PDF header...')
    try {
      doc.fontSize(24).font('Helvetica-Bold').text('Pen-Key Déli-caf', { align: 'center' })
    } catch (err) {
      console.error('Error adding header:', err)
      throw new Error(`Failed to add PDF header: ${err instanceof Error ? err.message : String(err)}`)
    }
    doc.fontSize(16).font('Helvetica').text('Daily Stock Check', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Session ID: ${session_id}`, { align: 'center' })
    doc.moveDown(1)

    // Date and initials boxes
    doc.fontSize(10)
    doc.text(`Date: _______________     Initials: _______________`, { align: 'center' })
    doc.moveDown(1)

    // QR Code
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')
    doc.image(qrBuffer, doc.page.width / 2 - 75, doc.y, { width: 150 })
    doc.moveDown(8)

    // Corner markers for alignment
    const drawCornerMarker = (x: number, y: number) => {
      doc.circle(x, y, 8).fillAndStroke('black', 'black')
    }
    drawCornerMarker(40, 40)
    drawCornerMarker(doc.page.width - 40, 40)
    drawCornerMarker(40, doc.page.height - 40)
    drawCornerMarker(doc.page.width - 40, doc.page.height - 40)

    // Helper to draw item row
    const drawItemRow = (item: any, showFreezer: boolean) => {
      const y = doc.y
      
      // Item name and ID
      doc.fontSize(10).font('Helvetica')
      doc.text(`${item.name}`, 60, y, { width: 250 })
      doc.fontSize(8).fillColor('gray')
      doc.text(`[${item.item_id}]`, 60, y + 12, { width: 250 })
      doc.fillColor('black')

      if (showFreezer) {
        // Freezer count box
        doc.fontSize(9).text('Freezer:', 320, y)
        doc.rect(370, y - 2, 60, 20).stroke()
        
        // Service count box
        doc.text('Service:', 440, y)
        doc.rect(490, y - 2, 60, 20).stroke()
      } else {
        // Service count box only
        doc.fontSize(9).text('Count:', 400, y)
        doc.rect(450, y - 2, 80, 20).stroke()
      }

      doc.moveDown(1.8)
    }

    // FREEZER Section
    if (freezerItems.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('FREEZER (BULK)', 60)
      doc.moveDown(0.5)
      freezerItems.forEach(item => drawItemRow(item, true))
      doc.moveDown(1)
    }

    // SERVICE / FRIDGE Section
    if (serviceItems.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('SERVICE / FRIDGE', 60)
      doc.moveDown(0.5)
      serviceItems.forEach(item => drawItemRow(item, false))
      doc.moveDown(1)
    }

    // DRY / RETAIL Section
    if (dryItems.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('DRY / RETAIL', 60)
      doc.moveDown(0.5)
      dryItems.forEach(item => drawItemRow(item, false))
    }

    doc.end()

    // Wait for PDF to finish
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="stock-check-${session_id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
