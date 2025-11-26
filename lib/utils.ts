// Utility functions for audio processing

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate audio file format
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac',
    'audio/mpga',
  ]
  
  return validTypes.includes(file.type) || 
         file.name.match(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|aac)$/i) !== null
}

/**
 * Get supported audio formats
 */
export function getSupportedFormats(): string[] {
  return ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.aac']
}
