// Which event the global editor dialog shows. Opened from anywhere, rendered once in app.vue.
interface EditorState {
  open: boolean;
  eventId: string | null;
  occurrenceStart: string | null;
  date: string;
}

export function useEventEditor() {
  const state = useState<EditorState>("event-editor", () => ({
    open: false,
    eventId: null,
    occurrenceStart: null,
    date: "",
  }));

  function openNew(date: string) {
    state.value = { open: true, eventId: null, occurrenceStart: null, date };
  }

  function openEdit(eventId: string, occurrenceStart: string) {
    state.value = { open: true, eventId, occurrenceStart, date: occurrenceStart.slice(0, 10) };
  }

  function close() {
    state.value.open = false;
  }

  return { state, openNew, openEdit, close };
}
