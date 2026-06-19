// Vite asset query suffixes used by the package's components.
// `?inline` returns the processed stylesheet as a string (no emitted CSS asset),
// which PhotoLightbox injects at runtime so it stays drop-in.
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// `?url` resolves an asset to its final emitted URL string. useReceiptExtractor
// imports the pdf.js worker this way so the consuming sub's Vite build emits a
// hashed worker asset and points GlobalWorkerOptions.workerSrc at it.
declare module '*?url' {
  const url: string;
  export default url;
}
