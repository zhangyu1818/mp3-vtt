import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

const SPEED_OPTIONS = ['0.5', '0.75', '1.0'] as const

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutesPart = Math.floor(seconds / 60)
  const secondsPart = seconds % 60
  return `${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`
}

type PlayerControlsProps = {
  disabled: boolean
  isPlaying: boolean
  currentMs: number
  durationMs: number
  playbackRate: number
  onTogglePlay: () => void
  onSeek: (nextMs: number) => void
  onBack10: () => void
  onForward10: () => void
  onRateChange: (rate: number) => void
}

export function PlayerControls({
  disabled,
  isPlaying,
  currentMs,
  durationMs,
  playbackRate,
  onTogglePlay,
  onSeek,
  onBack10,
  onForward10,
  onRateChange,
}: PlayerControlsProps) {
  const sliderMax = Math.max(durationMs, 1)
  const safeCurrent = Math.min(currentMs, sliderMax)
  const speedValue =
    playbackRate === 1 ? '1.0' : playbackRate === 0.75 ? '0.75' : '0.5'

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground md:text-sm">
        <span>{formatTime(currentMs)}</span>
        <span>{formatTime(durationMs)}</span>
      </div>
      <Slider
        aria-label="Playback progress"
        disabled={disabled}
        max={sliderMax}
        min={0}
        onValueChange={(value) => onSeek(value[0] ?? 0)}
        value={[safeCurrent]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Back 10 seconds"
            disabled={disabled}
            onClick={onBack10}
            size="icon"
            type="button"
            variant="secondary"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
            disabled={disabled}
            onClick={onTogglePlay}
            size="icon"
            type="button"
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button
            aria-label="Forward 10 seconds"
            disabled={disabled}
            onClick={onForward10}
            size="icon"
            type="button"
            variant="secondary"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Speed</span>
          <Select
            disabled={disabled}
            onValueChange={(value) => onRateChange(Number(value))}
            value={speedValue}
          >
            <SelectTrigger aria-label="Playback speed" className="w-[110px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
