export function getArticleCardImage(coverImageUrl?: string | null, contentHtml?: string | null) {
  if (coverImageUrl) return coverImageUrl;
  if (!contentHtml) return null;

  // Use the first inline article image as a visual fallback for cards/lists
  // when no dedicated cover image has been set.
  const match = contentHtml.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || null;
}
