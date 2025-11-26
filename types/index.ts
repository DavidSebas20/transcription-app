export interface TranscriptionResponse {
  success: boolean
  transcription?: string
  pdfUrl?: string
  error?: string
}

export interface AudioFile extends File {
  path?: string
}

export interface ProcessingStatus {
  stage: 'uploading' | 'converting' | 'splitting' | 'transcribing' | 'generating-pdf' | 'complete'
  progress: number
  message: string
}
