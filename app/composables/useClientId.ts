// One id per browser tab, sent with every change so the live stream can skip our own echo
export function useClientId() {
  const id = useState<string>("client-id", () => "");
  if (import.meta.client && !id.value) id.value = crypto.randomUUID();
  return id;
}
