'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

interface ImportResult {
  success: Array<{ name: string; category: string; unit: string }>
  failed: Array<{ line: number; data: string; error: string }>
  skipped: Array<{ line: number; reason: string }>
  totalLines: number
}

interface ImportResultsModalProps {
  results: ImportResult
  onClose: () => void
}

export function ImportResultsModal({ results, onClose }: ImportResultsModalProps) {
  const processed = results.success.length + results.failed.length + results.skipped.length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-navy">Import Results</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Processed {processed} of {results.totalLines} lines
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-700">{results.success.length}</p>
              <p className="text-sm text-gray-600">Imported</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-700">{results.failed.length}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-700">{results.skipped.length}</p>
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
          </div>

          {/* Successfully Imported */}
          {results.success.length > 0 && (
            <div>
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Successfully Imported ({results.success.length})
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {results.success.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="text-gray-600">
                        {item.category} • {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Failed Imports */}
          {results.failed.length > 0 && (
            <div>
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Failed to Import ({results.failed.length})
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-3">
                  {results.failed.map((item, idx) => (
                    <div key={idx} className="border-b border-red-200 last:border-0 pb-2">
                      <p className="text-sm font-medium text-gray-900">Line {item.line}</p>
                      <p className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded mt-1">
                        {item.data}
                      </p>
                      <p className="text-xs text-red-700 mt-1">❌ {item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Skipped Items */}
          {results.skipped.length > 0 && (
            <div>
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Skipped ({results.skipped.length})
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {results.skipped.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-gray-600">Line {item.line}:</span>{' '}
                      <span className="text-amber-700">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-navy mb-2">⚠️ Food Items = Ingredients Only</h4>
            <p className="text-sm text-gray-700 mb-2">
              This database is for <strong>raw ingredients and supplies</strong>, not menu items.
            </p>
            <div className="text-xs text-gray-700 grid grid-cols-2 gap-2">
              <div className="bg-green-100 p-2 rounded">
                <p className="font-semibold text-green-800">✅ Import These:</p>
                <p>Chicken breast, Tomatoes, Milk, Flour, Eggs, Coffee beans, Olive oil</p>
              </div>
              <div className="bg-red-100 p-2 rounded">
                <p className="font-semibold text-red-800">❌ Don't Import:</p>
                <p>BLT Sandwich, Chicken Club, Latte, Full Breakfast (these are menu items)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-navy mb-2">💡 CSV Format</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><strong>Ingredients format:</strong> <code className="bg-white px-1 rounded">name,category,unit</code></li>
              <li className="ml-4">Example: <code className="bg-white px-1 rounded">Chicken Breast,Protein,kg</code></li>
              <li className="ml-4">Example: <code className="bg-white px-1 rounded">Tomatoes,Vegetables,kg</code></li>
              <li className="ml-4">Example: <code className="bg-white px-1 rounded">Milk,Dairy,litre</code></li>
              <li className="mt-2">• Duplicate ingredient names will fail</li>
              <li>• Empty lines are skipped</li>
            </ul>
          </div>

          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
