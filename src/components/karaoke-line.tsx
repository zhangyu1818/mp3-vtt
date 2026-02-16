type KaraokeLineProps = {
  doneText: string
  pendingText: string
}

export function KaraokeLine({ doneText, pendingText }: KaraokeLineProps) {
  return (
    <p className="w-full max-w-5xl text-center font-serif text-[2rem] leading-[1.7] tracking-[0.01em] md:text-[2.8rem]">
      <span className="text-foreground">{doneText}</span>
      <span className="text-muted-foreground">{pendingText}</span>
    </p>
  )
}
