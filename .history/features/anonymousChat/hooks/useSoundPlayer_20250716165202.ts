import { useRef } from "react";

export function useSoundPlayer(soundOn: boolean) {
  const matchSoundRef = useRef<HTMLAudioElement>(null);
  const leaveSoundRef = useRef<HTMLAudioElement>(null);

  const playSound = (type: "match" | "leave") => {
    if (!soundOn) return;
    const audioRef = type === "match" ? matchSoundRef : leaveSoundRef;
    const play = async () => {
      try {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = 0.8;
        await audio.play();
      } catch (err) {
        const ctx = new AudioContext();
        await ctx.resume();
      }
    };
    play();
  };

  return { matchSoundRef, leaveSoundRef, playSound };
}
