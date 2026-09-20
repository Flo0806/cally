// Remember whether /news was reached from another page of the app. The first navigation
// has no origin (from.matched is empty), that is a reload or a return from an article.
export default defineNuxtRouteMiddleware((to, from) => {
  const cameFromApp = useState("news:from-app", () => false);
  cameFromApp.value = from.matched.length > 0 && from.path !== to.path;
});
