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

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const inputCls =
  "w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

const inputErrorCls =
  "w-full px-4 py-3 bg-canvas border border-[#fca5a5] text-ink text-sm focus:outline-none focus:border-[#991b1b] transition-colors"

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
            <label className={labelCls}>Certificate / Course Name *</label>
            <input
              type="text"
              value={cert.name}
              onChange={(e) => onUpdate({ ...cert, name: e.target.value })}
              placeholder="e.g. AWS Certified Developer"
              className={hasErrors && !cert.name ? inputErrorCls : inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Issuing Organisation *</label>
            <input
              type="text"
              value={cert.issuer}
              onChange={(e) => onUpdate({ ...cert, issuer: e.target.value })}
              placeholder="e.g. Amazon Web Services"
              className={hasErrors && !cert.issuer ? inputErrorCls : inputCls}
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
          <label className={labelCls}>Credential URL</label>
          <input
            type="url"
            value={cert.credentialUrl || ""}
            onChange={(e) => onUpdate({ ...cert, credentialUrl: e.target.value })}
            placeholder="https://www.credential.net/..."
            className={inputCls}
          />
        </div>

        {hasErrors && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b] px-4 py-3">
            {errors.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {editingCert && (
        <div className="bg-canvas border-2 border-ink p-4 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4">
            Add New Certificate
          </h3>
          {renderCertificateItem(editingCert, 0, setEditingCert)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingCert}
              className="px-4 py-2 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
              Save Certificate
            </button>
            <button
              onClick={() => setEditingCert(null)}
              className="px-4 py-2 bg-canvas border border-canvas-input-border text-ink text-[11px] font-semibold uppercase tracking-widest cursor-pointer hover:border-ink transition-colors">
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
              <p className="text-sm font-medium text-ink truncate leading-tight">
                {cert.name || <span className="italic text-ink-muted">Untitled certificate</span>}
              </p>
              <p className="text-xs text-ink-secondary truncate mt-0.5">
                {cert.issuer || "—"}
              </p>
            </div>
            {cert.issueDate && (
              <span className="ml-4 shrink-0 text-xs text-ink-muted">
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
