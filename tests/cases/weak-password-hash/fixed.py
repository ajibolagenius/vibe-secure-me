from argon2 import PasswordHasher

ph = PasswordHasher()


def store_password(conn, user_id: int, password: str) -> None:
    # Memory-hard KDF with a per-hash salt embedded in the encoded output.
    digest = ph.hash(password)
    conn.execute("UPDATE users SET password_hash = %s WHERE id = %s", (digest, user_id))
