import { useState } from "react"

import type { ModelConfig } from "~types/config"

interface ModelSelectorProps {
  models: ModelConfig[]
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedModelConfig =
    models.find((m) => m.id === selectedModel) || models[0]

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Model
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   bg-white text-left flex items-center justify-between
                   focus:ring-2 focus:ring-purple-500 hover:border-gray-400">
        <div>
          <div className="font-medium">{selectedModelConfig.name}</div>
          <div className="text-sm text-gray-500">
            {selectedModelConfig.description}
          </div>
        </div>
        <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onModelChange(model.id)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50
                        ${selectedModel === model.id ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}>
              <div className="font-medium flex items-center gap-2">
                {model.name}
                {model.recommended && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">{model.description}</div>
              <div className="text-xs text-gray-400 mt-1">
                Size: {model.size}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
