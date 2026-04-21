/**
 * Minimal layout for auth pages — no sidebar/topbar.
 * The root layout (fonts, ThemeProvider) still wraps this.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
