declare module 'jest-axe' {
  export const toHaveNoViolations: unknown
  export const axe: (element: Element) => Promise<{ violations: unknown[] }>
}
