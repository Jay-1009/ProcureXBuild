export type Supplier = {
  supplierName: string;
  supplierType: string;
  pan: string;
  gstNo: string;
  gstCategory?: string;
  isMsme: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  email: string;
  contactNo: string;
  password?: string;
  status?: string;
  role?: string;
};

const SUPPLIERS_KEY = "procurex.suppliers";
const SESSION_KEY = "procurex.session";
const ROLE_KEY = "procurex.role";

function safeWindow(): Window | null {
  return typeof window !== "undefined" ? window : null;
}

export function setRole(role: string) {
  safeWindow()?.localStorage.setItem(ROLE_KEY, role);
}

export function getRole(): string {
  const role = safeWindow()?.localStorage.getItem(ROLE_KEY);
  if (role) return role;
  return getSession() ? "Supplier" : "Supplier";
}

export function getSuppliers(): Supplier[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    return JSON.parse(w.localStorage.getItem(SUPPLIERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSupplier(s: Supplier) {
  const w = safeWindow();
  if (!w) return;
  const list = getSuppliers().filter((x) => x.email.toLowerCase() !== s.email.toLowerCase());
  list.push(s);
  w.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list));
}

export function findSupplier(email: string): Supplier | undefined {
  return getSuppliers().find((s) => s.email.toLowerCase() === email.toLowerCase());
}

export function setSession(email: string) {
  safeWindow()?.localStorage.setItem(SESSION_KEY, email);
}

export function getSession(): string | null {
  return safeWindow()?.localStorage.getItem(SESSION_KEY) ?? null;
}

export async function clearSession() {
  const w = safeWindow();
  if (w) {
    w.localStorage.removeItem(SESSION_KEY);
    w.localStorage.removeItem(ROLE_KEY);
  }
  try {
    await fetch("/api/method/logout", { method: "POST" });
  } catch (err) {
    console.error("Failed to call backend logout", err);
  }
}

let lastVerifiedTime = 0;
const VERIFICATION_CACHE_MS = 5 * 60 * 1000; // 5 minutes session verification cache

/** Call this immediately after a successful login to prevent syncSession from
 *  making a redundant get_current_supplier call when we already have fresh data. */
export function markSessionVerified() {
  lastVerifiedTime = Date.now();
}

export async function syncSession(): Promise<Supplier | null> {
  const email = getSession();
  if (!email) return null;

  // Return cached supplier if we've verified recently (5 min window)
  const now = Date.now();
  if (now - lastVerifiedTime < VERIFICATION_CACHE_MS) {
    const supplier = findSupplier(email);
    if (supplier) return supplier;
  }

  try {
    const res = await fetch("/api/method/procurex.api.get_current_supplier", {
      method: "POST",
      credentials: "include", // ensure session cookies are always sent
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // API call failed — fall back to local cache rather than clearing immediately.
      // Cookies may not propagate on very first request after login; local data is
      // still authoritative if a session key exists.
      const cached = findSupplier(email);
      if (cached) return cached;
      // Only clear if there is truly no locally stored data
      const w = safeWindow();
      if (w) {
        w.localStorage.removeItem(SESSION_KEY);
      }
      return null;
    }

    const data = await res.json();
    if (data.message) {
      const supplier: Supplier = data.message;
      saveSupplier(supplier);
      setSession(supplier.email);
      setRole(supplier.role || "Supplier");
      lastVerifiedTime = Date.now();
      return supplier;
    }
    // Unexpected empty message — use cached data
    return findSupplier(email) ?? null;
  } catch (error) {
    console.error("Error syncing session with Frappe", error);
    // Network error — use locally cached supplier data
    return findSupplier(email) ?? null;
  }
}