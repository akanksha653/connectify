import { Volume2, VolumeX, Users, RefreshCcw, CircleStop } from "lucide-react";

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
}: any) {
  const baseBtnClass =
    "flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition whitespace-nowrap";

  const renderControlButton = () => {
    if (!sessionStarted) {
      return (
        <button
          onClick={handleStart}
          className={`${baseBtnClass} bg-green-600 hover:bg-green-700 text-white`}
        >
          <Users className="w-5 h-5" />
          Start
        </button>
      );
    } else if (loading) {
      return (
        <button
          onClick={handleStop}
          className={`${baseBtnClass} bg-red-600 hover:bg-red-700 text-white`}
        >
          <CircleStop className="w-5 h-5" />
          Stop
        </button>
      );
    } else {
      return (
        <button
          onClick={handleSkip}
          className={`${baseBtnClass} bg-yellow-500 hover:bg-yellow-600 text-white`}
        >
          <RefreshCcw className="w-5 h-5" />
          Skip
        </button>
      );
    }
  };

  return (
    <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center justify-between">
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {userInfo.name}{" "}
          <span className="text-xs opacity-70">({userInfo.age})</span>
        </div>

        <button
          onClick={() => setSoundOn((prev: boolean) => !prev)}
          className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          title={soundOn ? "Mute Sounds" : "Unmute Sounds"}
        >
          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
        >
          <option value="">Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>

        <input
          type="text"
          placeholder="Country"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="w-[70%] sm:w-auto text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
        />

        {/* Start/Stop/Skip */}
        <div className="flex gap-2">{renderControlButton()}</div>
      </div>
    </div>
  );
}
