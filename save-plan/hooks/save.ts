import type { ProcessRunResult } from 'claude-code'

/** The command that saves the plan file under the project root, through the plugin's own script. */
export const saveArgv = (pluginRoot: string, projectRoot: string, name: string, planFile: string) =>
  [`${pluginRoot}/scripts/save-plan.sh`, '--root', projectRoot, name, planFile]

/** The saved file's path, which the script prints; a failed run throws with the script's error. */
export function savedPathOf(ran: ProcessRunResult): string {
  if (ran.exitCode !== 0) throw new Error(`save-plan.sh exited ${ran.exitCode}: ${ran.stderr.trim()}`)
  return ran.stdout.trim()
}
