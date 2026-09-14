import { useState } from "react"

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
            <label className="aa-label">Certificate / Course Name *</label>
            <input
              type="text"
              value={cert.name}
              onChange={(e) => onUpdate({ ...cert, name: e.target.value })}
              placeholder="e.g. AWS Certified Developer"
              className={hasErrors && !cert.name ? "aa-input-error" : "aa-input"}
            />
          </div>

          <div>
            <label className="aa-label">Issuing Organisation *</label>
            <input
              type="text"
              value={cert.issuer}
              onChange={(e) => onUpdate({ ...cert, issuer: e.target.value })}
              placeholder="e.g. Amazon Web Services"
              className={hasErrors && !cert.issuer ? "aa-input-error" : "aa-input"}
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
          <label className="aa-label">Credential URL</label>
          <input
            type="url"
            value={cert.credentialUrl || ""}
            onChange={(e) => onUpdate({ ...cert, credentialUrl: e.target.value })}
            placeholder="https://www.credential.net/..."
            className="aa-input"
          />
        </div>

        {hasErrors && (
          <div className="aa-message-error">
            {errors.map((e, i) => <p key={i} className="text-sm">• {e}</p>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {editingCert && (
        <div className="rounded-aa-md border border-aa-border bg-aa-neutral-50 p-aa-4 mb-6">
          <h3 className="text-sm font-semibold text-aa-text-primary mb-4">
            Add new certificate
          </h3>
          {renderCertificateItem(editingCert, 0, setEditingCert)}
          <div className="flex gap-3 mt-4">
            <button onClick={saveEditingCert} className="aa-btn-accent">
              Save certificate
            </button>
            <button
              onClick={() => setEditingCert(null)}
              className="aa-btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={safeCerts}
        getItemKey={(cert) => cert.id}
        onAdd={addCertificate}
        onUpdate={updateCertificate}
        onRemove={removeCertificate}
        renderItem={renderCertificateItem}
        renderSummary={(cert) => (
          <div className="flex flex-1 items-center justify-between min-w-0 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-aa-text-primary truncate leading-tight">
                {cert.name || <span className="italic text-aa-text-disabled">Untitled certificate</span>}
              </p>
              <p className="text-xs text-aa-text-secondary truncate mt-0.5">
                {cert.issuer || "—"}
              </p>
            </div>
            {cert.issueDate && (
              <span className="shrink-0 text-xs text-aa-text-secondary">
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
