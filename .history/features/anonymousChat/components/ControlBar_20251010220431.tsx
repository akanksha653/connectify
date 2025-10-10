import {
  Volume2,
  VolumeX,
  Users,
  RefreshCcw,
  CircleStop,
} from "lucide-react";

interface ControlBarProps {
  userInfo: any;
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  genderFilter: string;
  setGenderFilter: (val: string) => void;
  countryFilter: string;
  setCountryFilter: (val: string) => void;
  sessionStarted: boolean;
  loading: boolean;
  handleStart: () => void;
  handleStop: () => void;
  handleSkip: () => void;
}

export default function ControlBar({
  userInfo,
  soundOn,
  setSoundOn,
  genderFilter,
  setGenderFilter,
  countryFilter,
  setCountryFilter,
  sessionStarted,
  loading,
  handleStart,
  handleStop,
  handleSkip,
}: ControlBarProps) {
  const baseBtnClass =
    "flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed";

  const renderControlButton = () => {
    // 🟢 START button — only when not chatting or looking
    if (!sessionStarted && !loading) {
      return (
        <button
          onClick={handleStart}
          className={`${baseBtnClass} bg-green-600 hover:bg-green-700 text-white`}
          disabled={loading}
        >
          <Users className="w-5 h-5" />
          Start
        </button>
      );
    }

    // 🟡 SKIP button — when currently connected / matched
    if (sessionStarted && !loading) {
      return (
        <button
          onClick={handleSkip}
          className={`${baseBtnClass} bg-yellow-500 hover:bg-yellow-600 text-white`}
          disabled={loading}
          title="Skip and find new partner"
        >
          <RefreshCcw className="w-5 h-5" />
          Skip
        </button>
      );
    }

    // 🔴 STOP button — when in connecting/loading state
    return (
      <button
        onClick={handleStop}
        className={`${baseBtnClass} bg-red-600 hover:bg-red-700 text-white`}
        disabled={loading}
      >
        <CircleStop className="w-5 h-5" />
        Stop
      </button>
    );
  };

  return (
    <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center justify-between">
        {/* 🔊 Sound Toggle */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          title={soundOn ? "Mute Sounds" : "Unmute Sounds"}
        >
          {soundOn ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>

        {/* ⚧ Gender Filter */}
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
          aria-label="Gender Filter"
        >
          <option value="">Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>

        {/* 🌍 Country Filter */}
        <input
          type="text"
          placeholder="Country"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="w-[100px] sm:w-[120px] text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
        />

        {/* 🎛 Main Controls */}
        <div className="flex gap-2">{renderControlButton()}</div>
      </div>
    </div>
  );
}
