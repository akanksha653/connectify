import { Smile, UserX, Users } from "lucide-react";

export default function IdleMessage({ lastAction }: { lastAction: "skipped" | "left" | null }) {
  const baseStyle =
    "flex flex-col items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-400 p-4 text-sm gap-2";

  if (lastAction === "skipped") {
    return (
      <div className={baseStyle}>
        <Smile className="w-8 h-8 text-yellow-400" />
        <p>You skipped the chat.</p>
        <p>Click <b>Start</b> to connect with someone new!</p>
      </div>
    );
  } else if (lastAction === "left") {
    return (
      <div className={baseStyle}>
        <UserX className="w-8 h-8 text-red-400" />
        <p>Your partner left the chat.</p>
        <p>Click <b>Start</b> to begin again.</p>
      </div>
    );
  } else {
    return (
      <div className={baseStyle}>
        <Users className="w-8 h-8 text-neutral-400" />
        <p>Click <b>Start</b> to begin searching for a partner.</p>
      </div>
    );
  }
}
