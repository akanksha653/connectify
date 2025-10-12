// features/RoomSystem/utils/roomHelpers.ts

export const generateId = () => Math.random().toString(36).substring(2, 10);

export const formatTimestamp = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const getFileType = (file: File): "image" | "video" | "audio" | "file" => {
  const type = file.type;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
};
