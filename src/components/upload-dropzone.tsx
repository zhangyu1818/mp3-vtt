import { useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from '@/lib/utils'

type UploadDropzoneProps = {
  accept: string
  description: string
  fileName: string | null
  icon: ComponentType<LucideProps>
  title: string
  onSelectFile: (file: File | null) => void
}

export function UploadDropzone({
  accept,
  description,
  fileName,
  icon: Icon,
  title,
  onSelectFile,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  function openPicker() {
    inputRef.current?.click()
  }

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-xl border-2 border-dashed p-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragActive
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background/70 hover:border-primary/60 hover:bg-accent/35',
      )}
      onClick={openPicker}
      onDragLeave={() => setIsDragActive(false)}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragActive(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragActive(false)
        onSelectFile(event.dataTransfer.files[0] ?? null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPicker()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <input
        accept={accept}
        className="hidden"
        onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="font-sans text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 line-clamp-1 text-sm font-medium text-foreground">
        {fileName ?? 'Drop file here or click to browse'}
      </p>
    </div>
  )
}
