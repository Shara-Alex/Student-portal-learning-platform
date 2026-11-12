import { api, type Paginated } from "@/lib/api";
import { query } from "@/lib/crud";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message, MessageInput, Recipient } from "./types";

const BASE = "/api/communication/messages";

export const useMessages = (box: "inbox" | "sent", page = 1) =>
  useQuery({
    queryKey: ["messages", box, page],
    queryFn: () => api.get<Paginated<Message>>(`${BASE}/${query({ box, page })}`),
    placeholderData: keepPreviousData, // keep the old rows on screen while the next page loads
  });

/** Opening a message also marks it as read on the server, so the lists and the unread count refetch. */
export function useOpenMessage(id: number | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ["message", id],
    queryFn: async () => {
      const message = await api.get<Message>(`${BASE}/${id}/`);
      client.invalidateQueries({ queryKey: ["messages"] });
      return message;
    },
    enabled: id !== null,
  });
}

export const useUnreadCount = () =>
  useQuery({ queryKey: ["messages", "unread"], queryFn: () => api.get<{ count: number }>(`${BASE}/unread/`) });

export const useRecipients = (search: string) =>
  useQuery({ queryKey: ["recipients", search], queryFn: () => api.get<Recipient[]>(`${BASE}/recipients/${query({ search })}`) });

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: MessageInput) => api.post<Message>(`${BASE}/`, data),
    onSuccess: () => client.invalidateQueries({ queryKey: ["messages"] }),
  });
}
