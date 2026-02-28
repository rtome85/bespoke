import React, { useState } from "react"

import type { Certificate } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { DatePicker } from "./DatePicker"

interface CertificateEditorProps {
  certificates: Certificate[]
  onChange: (certificates: Certificate[]) => void
}

const validateCertificate = (cert: Certificate): string[] => {
  const errors = []
  if (!cert.name?.trim()) errors.push("Certificate name is required")
  if (!cert.issuer?.trim()) errors.push("Issuing organisation is required")
  if (!cert.issueDate) errors.push("Issue date is required")
  if (cert.credentialUrl && cert.credentialUrl.trim()) {
    try { new URL(cert.credentialUrl) } catch { errors.push("Invalid credential URL") }
  }
  return errors
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "Present"
  const [y, m] = iso.split("-")
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y}`
}

export function CertificateEditor({ certificates, onChange }: CertificateEditorProps) {
  const safeCerts = certificates || []
  const [editingCert, setEditingCert] = useState<Certificate | null>(null)

  const addCertificate = () => {
    if (editingCert) return
    setEditingCert({
      id: crypto.randomUUID(),
      name: "",
      issuer: "",
      issueDate: "",
      expiryDate: null,
      credentialUrl: ""
    })
  }

  const updateCertificate = (index: number, cert: Certificate) => {
    const updated = [...safeCerts]
    updated[index] = cert
    onChange(updated)
  }

  const removeCertificate = (index: number) => {
    onChange(safeCerts.filter((_, i) => i !== index))
  }

  const saveEditingCert = () => {
    if (!editingCert) return
    const errors = validateCertificate(editingCert)
    if (errors.length > 0) { alert(errors.join("\n")); return }
    onChange([...safeCerts, editingCert])
    setEditingCert(null)
  }

  const renderCertificateItem = (
    cert: Certificate,
    _index: number,
    onUpdate: (cert: Certificate) => void
  ) => {
    const errors = validateCertificate(cert)
    const hasErrors = errors.length > 0
    const noExpiry = cert.expiryDate === null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate / Course Name *
            </label>
            <input
              type="text"
              value={cert.name}
              onChange={(e) => onUpdate({ ...cert, name: e.target.value })}
              placeholder="e.g. AWS Certified Developer"
              className={`w-full px-4 py-3 border rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         ${hasErrors && !cert.name ? "border-red-300" : "border-gray-300"}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issuing Organisation *
            </label>
            <input
              type="text"
              value={cert.issuer}
              onChange={(e) => onUpdate({ ...cert, issuer: e.target.value })}
              placeholder="e.g. Amazon Web Services"
              className={`w-full px-4 py-3 border rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         ${hasErrors && !cert.issuer ? "border-red-300" : "border-gray-300"}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Issue Date *"
            value={cert.issueDate}
            onChange={(date) => onUpdate({ ...cert, issueDate: date || "" })}
            required
          />

          <DatePicker
            label="Expiry Date"
            value={cert.expiryDate ?? null}
            onChange={(date) => onUpdate({ ...cert, expiryDate: date })}
            showCurrentPosition
            currentPosition={noExpiry}
            onCurrentPositionChange={(noExp) =>
              onUpdate({ ...cert, expiryDate: noExp ? null : cert.expiryDate })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credential URL
          </label>
          <input
            type="url"
            value={cert.credentialUrl || ""}
            onChange={(e) => onUpdate({ ...cert, credentialUrl: e.target.value })}
            placeholder="https://www.credential.net/..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {hasErrors && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {errors.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {editingCert && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">
            Add New Certificate
          </h3>
          {renderCertificateItem(editingCert, 0, setEditingCert)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingCert}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg
                         hover:bg-purple-700 transition-colors font-medium">
              Save Certificate
            </button>
            <button
              onClick={() => setEditingCert(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                         hover:bg-gray-300 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={safeCerts}
        onAdd={addCertificate}
        onUpdate={updateCertificate}
        onRemove={removeCertificate}
        renderItem={renderCertificateItem}
        renderSummary={(cert) => (
          <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                {cert.name || <span className="italic text-gray-400">Untitled certificate</span>}
              </p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {cert.issuer || "—"}
              </p>
            </div>
            {cert.issueDate && (
              <span className="ml-4 shrink-0 text-xs text-gray-400">
                {formatDate(cert.issueDate)}
                {cert.expiryDate !== undefined && (
                  <> – {cert.expiryDate ? formatDate(cert.expiryDate) : "No expiry"}</>
                )}
              </span>
            )}
          </div>
        )}
        emptyMessage="No certificates added yet. Add your certifications and training courses!"
        addButtonText="Certificate"
      />
    </div>
  )
}
