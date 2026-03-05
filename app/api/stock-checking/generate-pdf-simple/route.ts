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
    let yPos = 10

    // Header - compact
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Penki Ops - Daily Stock Check', 10, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Session: ${session_id}`, 10, yPos + 4)
    
    // QR Code - small, top right corner
    doc.addImage(qrDataUrl, 'PNG', 175, 5, 25, 25)
    
    yPos += 12

    // Helper to draw item row - compact with simple numbering
    let itemNumber = 0
    const drawItemRow = (item: typeof items[0], showFreezer: boolean) => {
      if (yPos > 280) {
        doc.addPage()
        yPos = 10
      }

      itemNumber++
      
      // Simple number instead of long ID
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(`${itemNumber}.`, 10, yPos)
      doc.setFont('helvetica', 'normal')
      
      // Item name
      doc.setFontSize(8)
      doc.text(item.name, 18, yPos)

      if (showFreezer) {
        // Freezer box
        doc.rect(110, yPos - 2, 20, 5)
        doc.setFontSize(6)
        doc.text('F:', 95, yPos)
        // Service box
        doc.rect(135, yPos - 2, 20, 5)
        doc.text('S:', 130, yPos)
      } else {
        // Single count box
        doc.rect(120, yPos - 2, 25, 5)
        doc.setFontSize(6)
        doc.text('Qty:', 105, yPos)
      }

      yPos += 7
    }

    // Freezer section
    if (freezerItems.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FREEZER', 10, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      
      freezerItems.forEach(item => drawItemRow(item, true))
      yPos += 2
    }

    // Service/Fridge section
    if (serviceItems.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE / FRIDGE', 10, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      
      serviceItems.forEach(item => drawItemRow(item, false))
      yPos += 2
    }

    // Dry section
    if (dryItems.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('DRY / RETAIL', 10, yPos)
      yPos += 5
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
