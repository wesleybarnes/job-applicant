import React from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

/**
 * ConfirmModal — shown when the agent is ready to submit.
 * Displays a summary of what was filled and any concerns.
 *
 * Props:
 *   data       — { summary, fields_filled, concerns }
 *   screenshot — latest browser screenshot (base64)
 *   onConfirm  — user approves submission
 *   onCancel   — user rejects
 */
export default function ConfirmModal({ data, screenshot, onConfirm, onCancel }) {
  const { summary, fields_filled = [], concerns = [] } = data

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Ready to Submit</h2>
            <p className="text-sm text-purple-700">Review the application before the AI clicks submit</p>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Mini screenshot */}
          {screenshot && (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
              <img
                src={`data:image/png;base64,${screenshot}`}
                alt="Application state"
                className="w-full object-contain max-h-52"
              />
            </div>
          )}

          {/* Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>

          {/* Fields filled */}
          {fields_filled.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fields Filled</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {fields_filled.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {concerns.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Heads Up</h3>
              </div>
              <ul className="space-y-1">
                {concerns.map((c, i) => (
                  <li key={i} className="text-sm text-amber-700">• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <button
            onClick={onCancel}
            className="btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
            Don't Submit
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Yes, Submit Application
          </button>
        </div>
      </div>
    </div>
  )
}
