import { SYNC_KEYS, type SyncKey } from "~storage/keys"

const SCOPES = ["https://www.googleapis.com/auth/drive.appdata"]
const FILE_NAME = "bespoke-data.json"
const DRIVE_API = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

export interface SyncConfig {
  token: string
  lastSynced: string | null
  error?: string
}

async function authorize(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive: true, scopes: SCOPES },
      (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ?? "Authorization failed"
            )
          )
          return
        }
        resolve(token)
      }
    )
  })
}

async function findFile(token: string): Promise<string | null> {
  const res = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=name%3D%27${FILE_NAME}%27&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const json = await res.json()
  return json.files?.[0]?.id ?? null
}

async function push(token: string): Promise<void> {
  const data = await chrome.storage.local.get(SYNC_KEYS as unknown as string[])
  if (Object.keys(data).length === 0) return

  const metadata = { name: FILE_NAME, parents: ["appDataFolder"] }
  const body = JSON.stringify(data)
  const existingId = await findFile(token)

  if (existingId) {
    // Update existing file
    const res = await fetch(
      `${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body
      }
    )
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
  } else {
    // Create new file with multipart upload
    const boundary = "bespoke_boundary"
    const multipart = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      body,
      `--${boundary}--`
    ].join("\r\n")

    const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipart
    })
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
  }
}

/**
 * Restore the synced keys from the Drive backup.
 *
 * Returns the subset that was actually present in the backup, so the caller can
 * distinguish "the payload carried this key" from "the payload omitted it and
 * the local value survived" — the interviews migration needs exactly that
 * distinction to tell a pre-versioning backup from a current one.
 */
async function pull(token: string): Promise<Partial<Record<SyncKey, unknown>>> {
  const fileId = await findFile(token)
  if (!fileId) return {} // Nothing to restore yet
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`)

  const data = await res.json()

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid backup format in Google Drive")
  }

  // Only restore known sync keys to avoid importing garbage
  const toRestore: Partial<Record<SyncKey, unknown>> = {}
  for (const key of SYNC_KEYS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      toRestore[key] = (data as Record<SyncKey, unknown>)[key]
    }
  }
  if (Object.keys(toRestore).length > 0) {
    await chrome.storage.local.set(toRestore)
  }
  return toRestore
}

async function revoke(token: string): Promise<void> {
  // Best-effort revoke — ignore errors
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: "POST"
    })
  } catch {
    // Ignore network errors during revoke
  }
  chrome.identity.removeCachedAuthToken({ token }, () => {})
}

export { authorize, push, pull, revoke }
