import { useEffect, useState } from 'react'

/**
 * `value` once it has stayed the same for `delayMs`; until then, the value it had before.
 * For plain values (compared with ===), such as a string key built from an input.
 */
export function useDebouncedValue<T extends string | number | boolean | null>(
  value: T,
  delayMs: number,
): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}
