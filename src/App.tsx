import { useEffect, useMemo, useRef, useState } from 'react'
import { FileAudio, FileText, RotateCcw } from 'lucide-react'

import { KaraokeLine } from '@/components/karaoke-line'
import { PlayerControls } from '@/components/player-controls'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Button } from '@/components/ui/button'
import {
  findActiveCue,
  findLatestStartedCue,
  parseStrictVtt,
  type KaraokeCue,
} from '@/lib/parse-vtt'

const AUTO_PLAY_BLOCKED_MESSAGE =
  'Autoplay was blocked by the browser. Press play to continue.'

function App() {
  const audioRef = useRef<HTMLAudioElement>(null)

  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioName, setAudioName] = useState<string | null>(null)
  const [cues, setCues] = useState<KaraokeCue[]>([])
  const [vttName, setVttName] = useState<string | null>(null)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploader, setShowUploader] = useState(true)

  const hasMedia = Boolean(audioUrl) && cues.length > 0

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasMedia) {
      return
    }

    let cancelled = false
    audio.currentTime = 0
    audio.load()

    const playPromise = audio.play()
    if (!playPromise) {
      return
    }

    playPromise.catch(() => {
      if (!cancelled) {
        setIsPlaying(false)
        setError(AUTO_PLAY_BLOCKED_MESSAGE)
      }
    })

    return () => {
      cancelled = true
    }
  }, [hasMedia, audioUrl, cues])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = playbackRate
    }
  }, [playbackRate])

  const activeCue = useMemo(() => findActiveCue(cues, currentMs), [cues, currentMs])
  const displayedCue = useMemo(
    () => activeCue ?? findLatestStartedCue(cues, currentMs),
    [activeCue, cues, currentMs],
  )

  async function onVttSelected(file: File | null) {
    if (!file) {
      setCues([])
      setVttName(null)
      return
    }

    try {
      const text = await file.text()
      const parsed = parseStrictVtt(text)
      setCues(parsed)
      setVttName(file.name)
      setError(null)
      if (audioUrl) {
        setShowUploader(false)
      }
    } catch (parseError) {
      setCues([])
      setVttName(null)
      setError(
        parseError instanceof Error
          ? `Subtitle format error: ${parseError.message}`
          : 'Failed to parse subtitle file.',
      )
    }
  }

  function onAudioSelected(file: File | null) {
    setAudioUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous)
      }
      return file ? URL.createObjectURL(file) : null
    })
    setAudioName(file?.name ?? null)
    if (file && cues.length > 0) {
      setShowUploader(false)
    }
    setCurrentMs(0)
    setDurationMs(0)
    setIsPlaying(false)
  }

  function onReset() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setAudioUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous)
      }
      return null
    })
    setAudioName(null)
    setVttName(null)
    setCues([])
    setError(null)
    setCurrentMs(0)
    setDurationMs(0)
    setIsPlaying(false)
    setPlaybackRate(1)
    setShowUploader(true)
  }

  function onSeek(nextMs: number) {
    const audio = audioRef.current
    if (!audio || !hasMedia) {
      return
    }
    audio.currentTime = Math.min(Math.max(nextMs, 0), durationMs) / 1000
    setCurrentMs(Math.min(Math.max(nextMs, 0), durationMs))
  }

  function onTogglePlay() {
    const audio = audioRef.current
    if (!audio || !hasMedia) {
      return
    }

    if (audio.paused) {
      void audio.play().catch(() => {
        setError(AUTO_PLAY_BLOCKED_MESSAGE)
      })
      return
    }

    audio.pause()
  }

  function onJump(offsetMs: number) {
    onSeek(currentMs + offsetMs)
  }

  function onRateChange(rate: number) {
    const audio = audioRef.current
    setPlaybackRate(rate)
    if (audio) {
      audio.playbackRate = rate
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10">
      <audio
        onDurationChange={(event) => {
          setDurationMs(Math.floor(event.currentTarget.duration * 1000) || 0)
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          setCurrentMs(Math.floor(event.currentTarget.currentTime * 1000))
        }}
        ref={audioRef}
        src={audioUrl ?? undefined}
      />

      <div className="absolute top-6 right-4">
        {!showUploader && (
          <Button onClick={onReset} type="button" variant="secondary">
            <RotateCcw />
            Replace Files
          </Button>
        )}
      </div>

      <section className="flex h-[80vh] min-h-[36rem] flex-col gap-5 rounded-3xl border border-border/80 bg-card/45 p-5 shadow-sm backdrop-blur-sm md:p-8">
        {showUploader && (
          <div className="grid gap-3 md:grid-cols-2">
            <UploadDropzone
              accept=".mp3,audio/mpeg"
              description="Drop an MP3 file."
              fileName={audioName}
              icon={FileAudio}
              onSelectFile={onAudioSelected}
              title="Audio (MP3)"
            />
            <UploadDropzone
              accept=".vtt,text/vtt"
              description="Drop a VTT file with exactly one <b>...</b> segment per cue."
              fileName={vttName}
              icon={FileText}
              onSelectFile={(file) => {
                void onVttSelected(file)
              }}
              title="Subtitles (VTT)"
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-border/80 bg-popover/85 px-6 py-10 shadow-inner md:px-12 md:py-14">
            <KaraokeLine
              doneText={displayedCue?.doneText ?? ''}
              pendingText={displayedCue?.pendingText ?? ''}
            />
          </div>
          <PlayerControls
            currentMs={currentMs}
            disabled={!hasMedia}
            durationMs={durationMs}
            isPlaying={isPlaying}
            onBack10={() => onJump(-10_000)}
            onForward10={() => onJump(10_000)}
            onRateChange={onRateChange}
            onSeek={onSeek}
            onTogglePlay={onTogglePlay}
            playbackRate={playbackRate}
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}

export default App
