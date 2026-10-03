export const AGENT_NAME = 'wordsmith'

/** Where a user's own drafting agent may be: the project's first, then the user's. */
export const agentFiles = (root: string, home: string) => [
  `${root}/.claude/agents/${AGENT_NAME}.md`,
  `${home}/.claude/agents/${AGENT_NAME}.md`,
]

/** The task an Explore subagent gets for the facts a draft asked for. */
export function exploreTask(needs: string[], root: string): string {
  return [
    `Find these facts about the project in ${root}. Only read; change nothing.`,
    '',
    ...needs.map((need, i) => `${i + 1}. ${need}`),
    '',
    'Answer each one by its number in one to three short lines, naming the files you took it from.',
    'When the project does not answer one, say "not found" for it rather than guessing.',
  ].join('\n')
}
