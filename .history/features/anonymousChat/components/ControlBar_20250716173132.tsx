import { Volume2, VolumeX } from "lucide-react";

export default function ControlBar({
  userInfo,
  soundOn,
  setSoundOn,
  genderFilter,
  setGenderFilter,
  countryFilter,
  setCountryFilter,
  renderControlButton,
}: any) {
  return (
    <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 justify-between">
        {/* Name + Age */}
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
          {userInfo.name}{" "}
          <span className="text-xs opacity-70">({userInfo.age})</span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundOn((prev: boolean) => !prev)}
          className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          title={soundOn ? "Mute Sounds" : "Unmute Sounds"}
        >
          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Gender Filter */}
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

        {/* Country Filter */}
        <input
          type="text"
          placeholder="Country"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="w-[100px] sm:w-[120px] text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
        />

        {/* Start/Stop/Skip Button */}
        <div className="flex justify-end w-full sm:w-auto">
          {renderControlButton()}
        </div>
      </div>
    </div>
  );
}
