# API Security

## REST API Security

### Insecure Direct Object Reference (IDOR / BOLA)
- **Never trust client-provided IDs.** Always verify that the currently authenticated user has permission to access or modify the requested resource ID.

```typescript
// BAD: Trusts that the user is allowed to delete this document
app.delete('/docs/:id', async (req, res) => {
  await db.document.delete({ where: { id: req.params.id } });
});

// GOOD: Checks that the document belongs to the authenticated user
app.delete('/docs/:id', async (req, res) => {
  await db.document.delete({ 
    where: { 
      id: req.params.id, 
      ownerId: req.user.id 
    } 
  });
});
```

### Pagination and DoS
- **Never allow unlimited page sizes.** Attackers can request millions of records to crash your database or incur massive compute costs.
- Enforce strict `limit` caps on all paginated endpoints.

```typescript
// BAD: Client controls the limit
const data = await db.users.findMany({ take: req.body.limit });

// GOOD: Enforce a hard maximum
const limit = Math.min(Number(req.query.limit) || 20, 100);
const data = await db.users.findMany({ take: limit });
```

## GraphQL Security

### Disable Introspection in Production
- Introspection allows anyone to query the full schema of your GraphQL API. **Always disable introspection in production** to prevent attackers from discovering hidden fields and mutations.

### Depth and Complexity Limiting
- GraphQL allows deeply nested queries (e.g., `user -> posts -> comments -> author -> posts`). Attackers can craft massive queries to cause a Denial of Service (DoS).
- **Implement query depth limiting** (e.g., max depth of 5).
- **Implement query cost/complexity analysis** to reject overly expensive queries.

### Batching Attacks
- Attackers can exploit query batching to brute-force passwords or OTPs by sending thousands of mutations in a single HTTP request.
- Limit the maximum number of operations allowed in a single batched request.
