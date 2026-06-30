"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import {
  getSoundEnabledSnapshot,
  playSoundCue,
  setSoundEnabled,
  subscribeToSoundPreference,
} from "@/lib/sound";

export function SoundToggle({ className }: { className?: string }) {
  const enabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundEnabledSnapshot,
    () => false,
  );

  const label = enabled ? "Sound on" : "Sound off";

  function toggleSound() {
    const nextEnabled = !enabled;
    setSoundEnabled(nextEnabled);

    if (nextEnabled) {
      void playSoundCue("toggle-on");
    }
  }

  return (
    <Tooltip content={enabled ? "Turn sound off" : "Turn sound on"} side="bottom" className={className}>
      <IconButton
        aria-pressed={enabled}
        icon={enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        label={label}
        onClick={toggleSound}
        variant={enabled ? "primary" : "secondary"}
        className="size-9"
      />
    </Tooltip>
  );
}
