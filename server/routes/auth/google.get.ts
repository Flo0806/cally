import { sendRedirect } from "nuxt/server";
import { useRuntimeConfig } from "nitro/runtime-config";
import { fromLegacy } from "../../utils/compat";

// Google login via nuxt-auth-utils. Only the listed family accounts get a session.
export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const allowed = useRuntimeConfig()
      .allowedEmails.split(",")
      .map((email: string) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = String(user.email ?? "").toLowerCase();
    if (!user.email_verified || !allowed.includes(email)) {
      sendRedirect(fromLegacy(event), "/login?error=denied");
      return;
    }
    await setUserSession(event, { user: { email, name: user.name || email } });
    sendRedirect(fromLegacy(event), "/");
  },
  onError(event, error) {
    console.warn(`[auth] google login failed: ${String(error)}`);
    sendRedirect(fromLegacy(event), "/login?error=google");
  },
});
