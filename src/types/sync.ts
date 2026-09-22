export interface SyncConfig {
  token: string
  /**
   * Set once per Connect and kept across token refreshes, so a disconnect or
   * reconnect is detectable even though the token itself rotates.
   */
  connectionId?: string
  /** Epoch ms the access token expires; absent on pre-launchWebAuthFlow configs. */
  expiresAt?: number
  lastSynced: string | null
  error?: string
  /** Google account the token belongs to, shown in the options rail. */
  email?: string
}
