import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function GET() {
  try {
    console.log('Testing jsPDF...')
    
    // Create a simple PDF
    const doc = new jsPDF()
    doc.text('Test PDF - jsPDF is working!', 20, 20)
    doc.text('If you can see this, jsPDF works in serverless.', 20, 30)
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      },
    })
  } catch (error) {
    console.error('jsPDF test error:', error)
    return NextResponse.json({ 
      error: 'jsPDF failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 })
  }
}
