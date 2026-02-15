export type KaraokeCue = {
  startMs: number
  endMs: number
  fullText: string
  doneText: string
  pendingText: string
}

const TIMING_LINE_RE =
  /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})(?:\s+.*)?$/
const BOLD_SEGMENT_RE = /<b>([\s\S]*?)<\/b>/g

type RawCue = {
  startMs: number
  endMs: number
  rawText: string
}

function parseTimestampToMs(value: string): number {
  const match = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(value)
  if (!match) {
    throw new Error(`Invalid timestamp: ${value}`)
  }

  const [, hh, mm, ss, mmm] = match
  return (
    Number(hh) * 60 * 60 * 1000 +
    Number(mm) * 60 * 1000 +
    Number(ss) * 1000 +
    Number(mmm)
  )
}

function stripBoldTags(value: string): string {
  return value.replace(/<\/?b>/g, '')
}

function splitCueText(rawText: string): Omit<KaraokeCue, 'startMs' | 'endMs'> {
  const matches = Array.from(rawText.matchAll(BOLD_SEGMENT_RE)).map((match) => ({
    text: match[1],
    raw: match[0],
    index: match.index ?? 0,
  }))
  const plainText = stripBoldTags(rawText)

  if (matches.length === 0) {
    return {
      fullText: plainText,
      doneText: plainText,
      pendingText: '',
    }
  }

  const nonEmptyMatches = matches.filter((match) => match.text.length > 0)

  const selectedMatch =
    nonEmptyMatches.length === 1
      ? nonEmptyMatches[0]
      : nonEmptyMatches.length > 1
        ? nonEmptyMatches[0]
        : matches[0]

  const boldText = selectedMatch.text
  const startIndex = selectedMatch.index
  const endIndex = startIndex + selectedMatch.raw.length
  const before = stripBoldTags(rawText.slice(0, startIndex))
  const after = stripBoldTags(rawText.slice(endIndex))
  const fullText = `${before}${boldText}${after}`

  return {
    fullText,
    doneText: `${before}${boldText}`,
    pendingText: after,
  }
}

export function parseStrictVtt(input: string): KaraokeCue[] {
  const source = input.replace(/\r\n?/g, '\n').trim()
  if (!source.startsWith('WEBVTT')) {
    throw new Error('Invalid VTT file: missing WEBVTT header.')
  }

  const body = source.replace(/^WEBVTT[^\n]*\n?/, '').trim()
  if (!body) {
    throw new Error('Invalid VTT file: no cues found.')
  }

  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  const rawCues: RawCue[] = []

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    let timingLine = lines[0]
    let textLines = lines.slice(1)

    if (!timingLine.includes('-->')) {
      timingLine = lines[1] ?? ''
      textLines = lines.slice(2)
    }

    const timingMatch = TIMING_LINE_RE.exec(timingLine)
    if (!timingMatch) {
      throw new Error(`Invalid cue timing line: "${timingLine}"`)
    }

    const startMs = parseTimestampToMs(timingMatch[1])
    const endMs = parseTimestampToMs(timingMatch[2])
    if (endMs < startMs) {
      throw new Error(
        'Invalid cue time range: end must be greater than or equal to start.',
      )
    }
    const rawText = textLines.join(' ').trim()
    if (!rawText) {
      throw new Error('Invalid cue: empty text.')
    }

    rawCues.push({
      startMs,
      endMs,
      rawText,
    })
  }

  if (rawCues.length === 0) {
    throw new Error('Invalid VTT file: no valid cues found.')
  }

  const repairedCues: RawCue[] = []
  for (const cue of rawCues) {
    const previous = repairedCues[repairedCues.length - 1]
    repairedCues.push({
      ...cue,
      startMs: previous ? Math.max(cue.startMs, previous.startMs) : cue.startMs,
    })
  }

  const cues: KaraokeCue[] = repairedCues.map((cue, index) => {
    const nextCue = repairedCues[index + 1]
    let normalizedEnd = cue.endMs

    if (nextCue && nextCue.startMs >= cue.startMs) {
      normalizedEnd = Math.min(normalizedEnd, nextCue.startMs)
    }
    if (normalizedEnd <= cue.startMs && nextCue && nextCue.startMs > cue.startMs) {
      normalizedEnd = nextCue.startMs
    }
    if (normalizedEnd < cue.startMs) {
      normalizedEnd = cue.startMs
    }

    return {
      startMs: cue.startMs,
      endMs: normalizedEnd,
      ...splitCueText(cue.rawText),
    }
  })

  return cues
}

export function findActiveCue(
  cues: KaraokeCue[],
  currentMs: number,
): KaraokeCue | null {
  let left = 0
  let right = cues.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (cues[mid].startMs <= currentMs) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  for (let index = left - 1; index >= 0; index -= 1) {
    const cue = cues[index]
    if (currentMs < cue.startMs) {
      continue
    }
    if (
      currentMs < cue.endMs ||
      (cue.endMs === cue.startMs && currentMs === cue.startMs)
    ) {
      return cue
    }
    break
  }

  return null
}

export function findLatestStartedCue(
  cues: KaraokeCue[],
  currentMs: number,
): KaraokeCue | null {
  let left = 0
  let right = cues.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (cues[mid].startMs <= currentMs) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  return left > 0 ? cues[left - 1] : null
}
