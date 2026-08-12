export function CommentBody({ comment }: { comment: { html: string } }) {
  // comment.html is user-submitted and never sanitized.
  return <div dangerouslySetInnerHTML={{ __html: comment.html }} />
}
