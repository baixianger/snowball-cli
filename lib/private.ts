/**
 * Permissions for secrets on disk.
 * mkdir() only applies the mode when the directory is created, so existing
 * paths are chmod'd as well.
 */

import { chmodSync, mkdirSync } from "fs";

/** Directory that holds cookies or a browser profile: owner-only. */
export function secureDirectory(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}

/** Secret file (token, X authority): owner read/write. */
export function secureFile(path: string): void {
  chmodSync(path, 0o600);
}
