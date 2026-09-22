import { SYNC_KEYS, type SyncKey } from "~storage/keys"
import type { SyncConfig } from "~types/sync"

/**
 * OAuth client of type "Web application". Its authorized redirect URIs must
 * include `chrome.identity.getRedirectURL()` for every build that signs in
 * (`https://<extension-id>.chromiumapp.org/` on Chrome).
 */
const CLIENT_ID =
  "110025309401-unmk3hvf8ijv8ht2p74as08v9tnhifns.apps.googleusercontent.com"
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const SCOPES = ["https://www.googleapis.com/auth/drive.appdata"]
const FILE_NAME = "bespoke-data.json"
const DRIVE_API = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"
/** Refresh a little before Google's expiry so a push never races it. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000

export interface AuthResult {
  token: string
  expiresAt: number
}

function launchWebAuthFlow(url: string, interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        reject(
          new Error(chrome.runtime.lastError?.message ?? "Authorization failed")
        )
        return
      }
      resolve(responseUrl)
    })
  })
}

/**
 * Implicit-grant OAuth through `chrome.identity.launchWebAuthFlow`. With
 * `interactive: false` it uses `prompt=none`, so it only succeeds while the
 * user still has a Google session that already granted the scope.
 */
async function authorize({
  interactive = true,
  loginHint
}: { interactive?: boolean; loginHint?: string } = {}): Promise<AuthResult> {
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "token",
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: SCOPES.join(" "),
    state,
    include_granted_scopes: "true",
    prompt: interactive ? "select_account" : "none"
  })
  if (loginHint) params.set("login_hint", loginHint)

  const responseUrl = await launchWebAuthFlow(
    `${AUTH_ENDPOINT}?${params}`,
    interactive
  )
  const result = new URLSearchParams(new URL(responseUrl).hash.slice(1))

  const error = result.get("error")
  if (error) throw new Error(`Google authorization failed: ${error}`)
  if (result.get("state") !== state) {
    throw new Error("Google authorization failed: state mismatch")
  }
  const token = result.get("access_token")
  if (!token) throw new Error("Google authorization returned no token")

  const expiresIn = Number(result.get("expires_in")) || 3_600
  return { token, expiresAt: Date.now() + expiresIn * 1_000 }
}

/** Whether `connectionId` is still the stored Drive connection. */
async function isCurrentConnection(
  connectionId: string | undefined
): Promise<boolean> {
  const { syncConfig: current } = await chrome.storage.local.get("syncConfig")
  return !!current?.token && current.connectionId === connectionId
}

/**
 * A usable access token for `config`. Implicit-grant tokens can't be
 * refreshed, so an expired one is replaced by a silent re-authorization and
 * written back. Throws if the connection was disconnected or replaced while
 * re-authorizing, so a token is never handed out for a stale connection.
 */
async function getFreshToken(config: SyncConfig): Promise<string> {
  if (
    config.expiresAt &&
    config.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()
  ) {
    return config.token
  }

  let auth: AuthResult
  try {
    auth = await authorize({ interactive: false, loginHint: config.email })
  } catch {
    throw new Error("Google session expired — reconnect Google Drive")
  }

  const { syncConfig: current } = await chrome.storage.local.get("syncConfig")
  if (!current?.token || current.connectionId !== config.connectionId) {
    throw new Error("Google Drive connection changed")
  }
  if (current.token === config.token) {
    await chrome.storage.local.set({
      syncConfig: { ...current, token: auth.token, expiresAt: auth.expiresAt }
    })
  }
  return auth.token
}

/**
 * Email of the Google account behind the token. Drive's about endpoint accepts
 * the drive.appdata scope, so no extra OAuth scope or permission is needed.
 */
async function fetchAccountEmail(token: string): Promise<string | undefined> {
  const res = await fetch(`${DRIVE_API}/about?fields=user(emailAddress)`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Drive about failed: ${res.status}`)
  const json = await res.json()
  return json.user?.emailAddress || undefined
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
}

export {
  authorize,
  fetchAccountEmail,
  getFreshToken,
  isCurrentConnection,
  push,
  pull,
  revoke
}
