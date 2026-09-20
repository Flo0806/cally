const COOKIE = "cally-news-reader";
const MAX_AGE = 365 * 24 * 60 * 60;
// Coming from another cally page asks again, unless confirmed this recently
const CONFIRM_TTL_MS = 5 * 60 * 1000;

interface ReaderCookie {
  id: string;
  at: number;
}

// Who is reading on the shared tablet. A cookie, so the server already renders the right
// state. Reloads and coming back from an article keep the person; switching over from the
// calendar asks again after a while, because that is when someone else may have sat down.
export function useNewsReader() {
  const cookie = useCookie<ReaderCookie | null>(COOKIE, {
    default: () => null,
    maxAge: MAX_AGE,
    sameSite: "lax",
  });
  // Set by the route middleware when the navigation came from inside the app
  const cameFromApp = useState("news:from-app", () => false);

  const memberId = computed(() => cookie.value?.id ?? null);
  const mustConfirm = computed(
    () => cameFromApp.value && Date.now() - (cookie.value?.at ?? 0) > CONFIRM_TTL_MS,
  );

  function select(id: string) {
    cookie.value = { id, at: Date.now() };
    cameFromApp.value = false;
  }

  return { memberId, mustConfirm, select };
}
