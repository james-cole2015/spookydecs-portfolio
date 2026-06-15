// Vite asset query suffixes used by the package's components.
// `?inline` returns the processed stylesheet as a string (no emitted CSS asset),
// which PhotoLightbox injects at runtime so it stays drop-in.
declare module '*.css?inline' {
  const content: string;
  export default content;
}
