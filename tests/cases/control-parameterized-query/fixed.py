SORTABLE_COLUMNS = {"created_at", "amount_cents", "status"}


def list_invoices(conn, owner_id: int, sort_by: str, limit: int):
    if sort_by not in SORTABLE_COLUMNS:
        raise ValueError("unsupported sort column")

    # sort_by is interpolated but constrained to a fixed allowlist; it can
    # never carry user text. Every value is a bound parameter.
    query = f"SELECT id, amount_cents, status FROM invoices WHERE owner_id = %s ORDER BY {sort_by} DESC LIMIT %s"
    cur = conn.cursor()
    cur.execute(query, (owner_id, min(limit, 100)))
    return cur.fetchall()
