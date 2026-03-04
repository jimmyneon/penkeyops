'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

function PrintTemplateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      generatePdf()
    }
  }, [sessionId])

  const generatePdf = async () => {
    try {
      const response = await fetch('/api/stock-checking/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setLoading(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/ops/stock-checking')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Print Template</h1>
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating PDF template...</p>
          </div>
        ) : pdfUrl ? (
          <>
            <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold mb-3">Template Ready</h2>
              <p className="text-muted-foreground mb-4">
                Your stock check template is ready. Print it, fill in the counts by hand, then scan it back in.
              </p>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Print the template (A4 paper)</li>
                  <li>Write integer counts in the boxes</li>
                  <li>Use the QR code or camera to scan when done</li>
                  <li>Keep the sheet flat and well-lit for scanning</li>
                </ol>
              </div>

              <button
                onClick={handlePrint}
                className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <Download className="h-5 w-5" />
                Open PDF to Print
              </button>
            </div>

            {/* PDF Preview */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Preview</h3>
              <iframe
                src={pdfUrl}
                className="w-full h-[600px] border border-border rounded-xl"
                title="Stock Check Template"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to generate PDF. Please try again.</p>
            <button
              onClick={generatePdf}
              className="mt-4 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-all"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PrintTemplatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <PrintTemplateContent />
    </Suspense>
  )
}
