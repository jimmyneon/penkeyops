import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
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
    const freezerItems = items.filter(i => i.is_freezer_item && i.location === 'freezer')
    const serviceItems = items.filter(i => i.location === 'fridge')
    const dryItems = items.filter(i => i.location === 'dry')

    // Generate QR code
    const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ops/stock-checking/${session_id}/scan`
    const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 150 })

    // Create PDF with jsPDF (works in serverless)
    const doc = new jsPDF()
    let yPos = 20

    // Header
    doc.setFontSize(20)
    doc.text('Pen-Key Déli-caf', 105, yPos, { align: 'center' })
    yPos += 10
    doc.setFontSize(14)
    doc.text('Daily Stock Check', 105, yPos, { align: 'center' })
    yPos += 8
    doc.setFontSize(10)
    doc.text(`Session ID: ${session_id}`, 105, yPos, { align: 'center' })
    yPos += 10

    // QR Code
    doc.addImage(qrDataUrl, 'PNG', 80, yPos, 50, 50)
    yPos += 60

    // Helper to draw item row
    const drawItemRow = (item: typeof items[0], showFreezer: boolean) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(10)
      doc.text(item.name, 20, yPos)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`[${item.item_id}]`, 20, yPos + 4)
      doc.setTextColor(0, 0, 0)

      if (showFreezer) {
        doc.rect(120, yPos - 4, 30, 8)
        doc.text('Freezer:', 95, yPos)
        doc.rect(160, yPos - 4, 30, 8)
        doc.text('Service:', 155, yPos + 10)
      } else {
        doc.rect(140, yPos - 4, 40, 8)
        doc.text('Count:', 120, yPos)
      }

      yPos += showFreezer ? 16 : 12
    }

    // Freezer section
    if (freezerItems.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('FREEZER (Bulk Stock)', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      
      freezerItems.forEach(item => drawItemRow(item, true))
      yPos += 5
    }

    // Service/Fridge section
    if (serviceItems.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE / FRIDGE', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      
      serviceItems.forEach(item => drawItemRow(item, false))
      yPos += 5
    }

    // Dry section
    if (dryItems.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('DRY / RETAIL', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      
      dryItems.forEach(item => drawItemRow(item, false))
    }

    // Generate PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
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
