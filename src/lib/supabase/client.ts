/**
 * Native Client Auth Stub for Client Components.
 * Routes authentication through /api/auth/* and /api/user/profile.
 */
export function createClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          return { data: null, error: new Error(data.error || "Authentication failed") };
        }
        return { data, error: null };
      },
      async signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
        return { error: null };
      },
      async getUser() {
        try {
          const res = await fetch("/api/user/profile");
          const data = await res.json();
          if (!res.ok || (!data.user && !data.email)) {
            return { data: { user: null }, error: new Error("Unauthorized") };
          }
          const userObj = data.user || data;
          return {
            data: {
              user: {
                ...userObj,
                user_metadata: { full_name: userObj.full_name || "" },
              },
            },
            error: null,
          };
        } catch (err: any) {
          return { data: { user: null }, error: err };
        }
      },
      async getSession() {
        const { data } = await this.getUser();
        return { data: { session: data.user ? { user: data.user } : null }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        this.getUser().then(({ data }) => {
          if (data.user) {
            callback("SIGNED_IN", { user: data.user });
          } else {
            callback("SIGNED_OUT", null);
          }
        });
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
    },
  };
}
