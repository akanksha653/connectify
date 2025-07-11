import { create } from "zustand";

interface ChatState {
  messages: { content: string; sender: "me" | "partner" }[];
  addMessage: (message: { content: string; sender: "me" | "partner" }) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
}));
