import { describe, expect, it } from 'vitest'

import { logInProblems, logInUsername } from './logInChecks'

describe('logInProblems', () => {
  it('asks for both fields', () => {
    expect(logInProblems({ username: '', password: '' })).toEqual({
      username: 'username_required',
      password: 'password_required',
    })
  })

  it('counts a username of spaces as empty, but never trims the password', () => {
    expect(logInProblems({ username: '   ', password: ' ' })).toEqual({
      username: 'username_required',
    })
  })

  it('has nothing to say when both are filled in', () => {
    expect(logInProblems({ username: 'meiling', password: 'x' })).toEqual({})
  })
})

describe('logInUsername', () => {
  it('trims and lowercases, as the backends store usernames', () => {
    expect(logInUsername(' MeiLing ')).toBe('meiling')
    expect(logInUsername('weijie')).toBe('weijie')
  })
})
