/**
 * Ambient module shims for imports that have no TypeScript declarations.
 *
 * `samples/*.js` are learner-facing scripts imported as raw text (with
 * `{ type: "text" }` and inlined by webpack); their default export is the
 * source string.
 */

declare module '*.js' {
  const content: string;
  export default content;
}
