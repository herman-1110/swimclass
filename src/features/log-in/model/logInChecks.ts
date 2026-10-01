/** The log-in form's fields, in focus order. */
export type LogInField = 'username' | 'password'

/** What the form says about each field before any call: a messages.ts code. */
export type LogInProblems = Partial<Record<LogInField, 'username_required' | 'password_required'>>

/** The form's checks before any call (auth spec §5.4, §6.1): both fields filled in. */
export function logInProblems({ username, password }: Record<LogInField, string>): LogInProblems {
  const problems: LogInProblems = {}
  if (username.trim() === '') problems.username = 'username_required'
  if (password === '') problems.password = 'password_required'
  return problems
}

/**
 * The username as the backends store it: trimmed and lowercased (auth spec W1), so
 * " MeiLing " logs in as meiling. The password is sent exactly as typed.
 */
export function logInUsername(input: string): string {
  return input.trim().toLowerCase()
}
