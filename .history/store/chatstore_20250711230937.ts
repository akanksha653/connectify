import { create } from "zustand";

type Sender = "me" | "partner";

interface Message {
  content: string;
  sender: Sender;
}

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  replaceMessages: (messages: Message[]) => void; // optional utility
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  replaceMessages: (messages) => set({ messages }),
}));
