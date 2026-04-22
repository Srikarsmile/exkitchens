export function getShimmerBlurDataUrl(width: number, height: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#eef2ee" offset="20%" />
          <stop stop-color="#dfe6df" offset="50%" />
          <stop stop-color="#eef2ee" offset="80%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#eef2ee" />
      <rect id="r" width="${width}" height="${height}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="${-width}" to="${width}" dur="1.35s" repeatCount="indefinite" />
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
