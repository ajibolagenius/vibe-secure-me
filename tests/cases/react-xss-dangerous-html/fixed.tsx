import DOMPurify from 'dompurify'

export function CommentBody({ comment }: { comment: { html: string } }) {
  const clean = DOMPurify.sanitize(comment.html, {
    ALLOWED_TAGS: ['p', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code'],
    ALLOWED_ATTR: ['href'],
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
