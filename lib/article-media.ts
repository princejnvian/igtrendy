function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function extractImageUrl(contentHtml?: string | null) {
  if (!contentHtml) return null;

  const html = decodeHtmlEntities(contentHtml);

  // Support normal src="...", entity-encoded quotes, unquoted src values,
  // and lazy-loaded data-src attributes used by some editors/importers.
  const patterns = [
    /<(?:img|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i,
    /<(?:img|source)\b[^>]*\bsrc\s*=\s*([^\s>]+)/i,
    /<(?:img|source)\b[^>]*\bdata-src\s*=\s*["']([^"']+)["']/i,
    /<(?:img|source)\b[^>]*\bdata-src\s*=\s*([^\s>]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const url = match[1].trim().replace(/^['"]|['"]$/g, '');
      if (url && !url.startsWith('data:')) return url;
    }
  }

  // Handle HTML that contains escaped markup such as &lt;img src=&quot;...&quot;&gt;.
  const decodedMarkup = html
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  for (const pattern of patterns) {
    const match = decodedMarkup.match(pattern);
    if (match?.[1]) {
      const url = match[1].trim().replace(/^['"]|['"]$/g, '');
      if (url && !url.startsWith('data:')) return url;
    }
  }

  return null;
}

export function getArticleCardImage(coverImageUrl?: string | null, contentHtml?: string | null) {
  const cover = coverImageUrl?.trim();
  if (cover && !cover.startsWith('data:')) return cover;
  return extractImageUrl(contentHtml);
}
