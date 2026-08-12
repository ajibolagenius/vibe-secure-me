import hashlib


def store_password(conn, user_id: int, password: str) -> None:
    # Fast, unsalted, GPU-friendly. Trivially reversed from a dump.
    digest = hashlib.md5(password.encode()).hexdigest()
    conn.execute("UPDATE users SET password_hash = %s WHERE id = %s", (digest, user_id))
