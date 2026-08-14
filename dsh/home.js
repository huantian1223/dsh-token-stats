// DSH home resolution, vendored from @deepseek-ai/dsh-home-paths (tiny,
// harness-free) so the plugin stays dependency-free: an explicit configured
// path, then $DSH_HOME, then ~/.dsh. The deployment here sets $DSH_HOME to
// the checkout's data root; a default install uses ~/.dsh.

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export function resolveDshHome(env = process.env) {
  const fromEnv = env.DSH_HOME
  const value = fromEnv !== undefined && String(fromEnv).trim().length > 0 ? fromEnv : join(homedir(), '.dsh')
  return resolve(value)
}

export function dshHomePath(...segments) {
  return join(resolveDshHome(), ...segments)
}
