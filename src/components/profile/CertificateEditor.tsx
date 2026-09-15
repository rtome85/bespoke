import { Plus } from "lucide-react"
import { useState } from "react"

import type { Certificate } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { DatePicker } from "./DatePicker"
import { ProfileEntryModal } from "./ProfileEntryModal"

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
    // An untouched draft is not yet wrong: hold the required-field errors
    // back until something has been entered, so the add dialog doesn't open
    // already flagging three problems.
    const isBlank =
      !cert.name?.trim() &&
      !cert.issuer?.trim() &&
      !cert.issueDate &&
      !cert.expiryDate &&
      !cert.credentialUrl?.trim()
    const hasErrors = errors.length > 0 && !isBlank

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
            label="Issue Date"
            value={cert.issueDate}
            onChange={(date) => onUpdate({ ...cert, issueDate: date || "" })}
            required
          />

          {/* No "no expiry" toggle: an empty date already means the
              certificate doesn't expire. */}
          <DatePicker
            label="Expiry Date"
            value={cert.expiryDate ?? null}
            onChange={(date) => onUpdate({ ...cert, expiryDate: date })}
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
    <section className="space-y-2.5">
      <div className="aa-list-section-header">
        <h2 className="aa-card-heading tracking-aa-tighter-2">
          Certificates &amp; training
        </h2>
        <button
          onClick={addCertificate}
          className="aa-btn-outline inline-flex items-center gap-aa-2">
          <Plus className="w-aa-px-15 h-aa-px-15" />
          Add certificate
        </button>
      </div>

      {editingCert && (
        <ProfileEntryModal
          title="Add new certificate"
          saveLabel="Save certificate"
          onSave={saveEditingCert}
          onCancel={() => setEditingCert(null)}>
          {renderCertificateItem(editingCert, 0, setEditingCert)}
        </ProfileEntryModal>
      )}

      <div className="aa-card-base">
        <ArrayInput
          items={safeCerts}
          getItemKey={(cert) => cert.id}
          onAdd={addCertificate}
          onUpdate={updateCertificate}
          onRemove={removeCertificate}
          renderItem={renderCertificateItem}
          renderSummary={(cert) => (
            <div className="flex flex-1 items-center justify-between min-w-0 gap-aa-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-aa-text-primary truncate">
                  {cert.name || <span className="italic text-aa-text-secondary">Untitled certificate</span>}
                </p>
                <p className="text-xs text-aa-text-secondary truncate mt-0.5">
                  {cert.issuer || "—"}
                </p>
              </div>
              {cert.issueDate && (
                <div className="shrink-0 text-right">
                  <span className="block text-aa-caption font-medium text-aa-neutral-500">
                    {formatDate(cert.issueDate)}
                  </span>
                  {cert.expiryDate && (
                    <span className="aa-status-warn mt-aa-px-3 flex items-center justify-end gap-1.5 text-aa-11 font-semibold">
                      <span className="aa-status-dot" />
                      Expires {formatDate(cert.expiryDate)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          emptyMessage="No certificates added yet. Add your certifications and training courses!"
          addButtonText="Certificate"
          flush
        />
      </div>
    </section>
  )
}
