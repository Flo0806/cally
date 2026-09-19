// Who is reading on the shared tablet. Asked every time the news open, nothing is remembered.
export function useNewsReader() {
  const memberId = useState<string | null>("news:reader", () => null);

  return {
    memberId,
    select: (id: string | null) => {
      memberId.value = id;
    },
  };
}
