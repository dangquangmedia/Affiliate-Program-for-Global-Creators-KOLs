// Client trình duyệt gọi API auth thật (N6). Chạy phía client nên base URL phải là public.
// Token lưu localStorage; mọi request sau gắn `Authorization: Bearer <token>`.
// Đây là "spine chạy thật" chạm tới trình duyệt: đăng nhập tạo user + session THẬT trong DB.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const STORAGE_KEY = "ag_session";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface StoredSession {
  token: string;
  user: AuthUser;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly kind: "unreachable" | "rejected",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Mock SSO login: đổi email lấy token + user. Ném AuthError nếu API chết/từ chối. */
export async function mockLogin(email: string, displayName?: string): Promise<StoredSession> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/mock-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, displayName }),
    });
  } catch {
    throw new AuthError("Không kết nối được API auth. Chạy `corepack pnpm dev:api`.", "unreachable");
  }
  if (!res.ok) {
    throw new AuthError("Đăng nhập bị từ chối.", "rejected");
  }
  const body = (await res.json()) as { token: string; user: AuthUser };
  return { token: body.token, user: body.user };
}

/** Lấy identity từ session server (xác thực token còn hiệu lực). null nếu không hợp lệ. */
export async function fetchMe(token: string): Promise<{ user: AuthUser } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as { user: AuthUser };
  } catch {
    return null;
  }
}

// ---- lưu/đọc session (localStorage, chỉ chạy phía client) ----
export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
