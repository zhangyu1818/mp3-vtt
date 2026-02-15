import { describe, expect, it } from 'vitest'

import { findActiveCue, findLatestStartedCue, parseStrictVtt } from './parse-vtt'

const validVtt = `WEBVTT

1
00:00:38.640 --> 00:00:38.800
<b>To</b> celebrate, we're gonna record.

2
00:00:38.800 --> 00:00:39.000
To <b>cele</b>brate, we're gonna record.
`

describe('parseStrictVtt', () => {
  it('parses valid VTT cues and builds karaoke segments', () => {
    const cues = parseStrictVtt(validVtt)

    expect(cues).toHaveLength(2)
    expect(cues[0]).toMatchObject({
      startMs: 38640,
      endMs: 38800,
      fullText: "To celebrate, we're gonna record.",
      doneText: 'To',
      pendingText: " celebrate, we're gonna record.",
    })
    expect(cues[1]).toMatchObject({
      doneText: 'To cele',
      pendingText: "brate, we're gonna record.",
    })
  })

  it('falls back to full-sentence highlight when cue has no <b> segment', () => {
    const input = `WEBVTT

00:00:01.000 --> 00:00:02.000
No bold segment here
`

    const cues = parseStrictVtt(input)
    expect(cues).toHaveLength(1)
    expect(cues[0]).toMatchObject({
      fullText: 'No bold segment here',
      doneText: 'No bold segment here',
      pendingText: '',
    })
  })

  it('uses the first non-empty highlight when cue has ambiguous <b> tags', () => {
    const input = `WEBVTT

00:00:01.000 --> 00:00:02.000
<b>To</b> <b>cele</b>brate
`

    const cues = parseStrictVtt(input)
    expect(cues).toHaveLength(1)
    expect(cues[0]).toMatchObject({
      fullText: 'To celebrate',
      doneText: 'To',
      pendingText: ' celebrate',
    })
  })

  it('treats empty <b> tags as cursor position and keeps karaoke progress', () => {
    const input = `WEBVTT

00:00:01.000 --> 00:00:02.000
Episode<b></b> <b></b>700 of the show.
`

    const cues = parseStrictVtt(input)
    expect(cues).toHaveLength(1)
    expect(cues[0]).toMatchObject({
      fullText: 'Episode 700 of the show.',
      doneText: 'Episode',
      pendingText: ' 700 of the show.',
    })
  })

  it('throws when cue time is invalid', () => {
    const input = `WEBVTT

00:00:02.000 --> 00:00:01.000
<b>To</b> celebrate
`

    expect(() => parseStrictVtt(input)).toThrow(/time range/i)
  })

  it('keeps source order and repairs out-of-order starts to monotonic timeline', () => {
    const input = `WEBVTT

00:00:03.000 --> 00:00:04.000
<b>First</b> line

00:00:02.000 --> 00:00:03.000
<b>Second</b> line
`

    const cues = parseStrictVtt(input)
    expect(cues).toHaveLength(2)
    expect(cues[0]?.startMs).toBe(3000)
    expect(cues[0]?.doneText).toBe('First')
    expect(cues[1]?.startMs).toBe(3000)
    expect(cues[1]?.doneText).toBe('Second')
  })

  it('accepts zero-duration cues and normalizes with next cue timing', () => {
    const input = `WEBVTT

00:00:00.080 --> 00:00:00.160
<b>We</b>'re recording.

00:00:00.160 --> 00:00:00.240
We<b>'</b>re recording.

00:00:00.240 --> 00:00:00.240
We'<b>re</b> recording.

00:00:00.240 --> 00:00:00.400
We're <b>rec</b>ording.
`

    const cues = parseStrictVtt(input)
    expect(cues).toHaveLength(4)
    expect(cues[2]?.startMs).toBe(240)
    expect(cues[2]?.endMs).toBe(240)
    expect(cues[3]?.endMs).toBe(400)
  })
})

describe('findActiveCue', () => {
  it('returns the cue in active time range', () => {
    const cues = parseStrictVtt(validVtt)

    expect(findActiveCue(cues, 38700)?.fullText).toBe(
      "To celebrate, we're gonna record.",
    )
    expect(findActiveCue(cues, 38850)?.doneText).toBe('To cele')
    expect(findActiveCue(cues, 40000)).toBeNull()
  })
})

describe('findLatestStartedCue', () => {
  it('returns the latest started cue when there is no active cue', () => {
    const cues = parseStrictVtt(validVtt)

    expect(findLatestStartedCue(cues, 38850)?.doneText).toBe('To cele')
    expect(findLatestStartedCue(cues, 39000)?.doneText).toBe('To cele')
    expect(findLatestStartedCue(cues, 10)).toBeNull()
  })
})
