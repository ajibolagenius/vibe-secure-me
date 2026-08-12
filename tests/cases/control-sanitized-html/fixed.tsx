import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre']

export function ArticleBody({ html }: { html: string }) {
  // Sanitized with a restrictive allowlist before rendering. This use of
  // dangerouslySetInnerHTML is correct.
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
  })
  return <article dangerouslySetInnerHTML={{ __html: clean }} />
}
