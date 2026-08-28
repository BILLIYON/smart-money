"use client";

export function createClient() {
  return {
    auth: {
      async getUser() {
        try {
          const res = await fetch("/api/auth/me");
          if (!res.ok) return { data: { user: null }, error: null };
          const data = await res.json();
          return { data: { user: data.user }, error: null };
        } catch {
          return { data: { user: null }, error: null };
        }
      },
      async getSession() {
        try {
          const res = await fetch("/api/auth/me");
          if (!res.ok) return { data: { session: null }, error: null };
          const data = await res.json();
          return { data: { session: data.user ? { user: data.user } : null }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      },
      async signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      },
    },
    from(_table: string) {
      const chain: any = {
        select() { return chain; },
        eq() { return chain; },
        in() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        single() { return chain; },
        async then(resolve: any) {
          resolve({ data: [], error: null });
        },
        async insert() { return { data: null, error: null }; },
        async update() { return { data: null, error: null }; },
        async delete() { return { data: null, error: null }; },
      };
      return chain;
    },
    channel() {
      return {
        on() { return this; },
        subscribe() { return this; },
      };
    },
    removeChannel() {},
  };
}
