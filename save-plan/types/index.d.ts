// The plan file of the session's main loop, as the plan-mode reminder names it; null until one is seen.
export type PlanFile = string | null

declare module 'claude-code' {
  interface PluginState {
    'save-plan': { 'plan-file': PlanFile }
  }
}
