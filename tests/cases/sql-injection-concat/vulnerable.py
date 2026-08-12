def find_user_by_email(conn, email: str):
    cur = conn.cursor()
    cur.execute("SELECT id, email, role FROM users WHERE email = '" + email + "'")
    return cur.fetchone()
