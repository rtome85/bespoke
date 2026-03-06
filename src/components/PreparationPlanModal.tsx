import { Lightbulb, X } from "lucide-react"

interface PreparationPlanModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  companyName: string
  interviewType: string
  onSave?: () => void
}

// Simple markdown parser to HTML
function parseMarkdown(markdown: string): string {
  if (!markdown) return ""

  return (
    markdown
      // Escape HTML to prevent XSS
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>'
      )
      // Bold
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold text-gray-900">$1</strong>'
      )
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">$1</code>'
      )
      // Code blocks
      .replace(
        /```([^\n]*)\n([\s\S]*?)```/g,
        '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono">$2</code></pre>'
      )
      // Unordered lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
      .replace(/(<li.*<\/li>\n)+/g, '<ul class="list-disc mb-4">$&</ul>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
      // Line breaks
      .replace(/\n/g, "<br />")
  )
}

export function PreparationPlanModal({
  isOpen,
  onClose,
  content,
  companyName,
  interviewType,
  onSave
}: PreparationPlanModalProps) {
  if (!isOpen) return null

  const formattedContent = parseMarkdown(content)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lightbulb size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Preparation Plan
              </h3>
              <p className="text-sm text-gray-500">
                {companyName} - {interviewType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content)
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg
                       text-gray-700 hover:bg-gray-50 transition-colors">
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg
                       text-gray-700 hover:bg-gray-50 transition-colors">
            Close
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600
                         text-white rounded-lg hover:opacity-90 transition-opacity">
              Save to Application
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
