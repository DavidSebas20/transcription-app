'use client'

import { useState, useCallback } from 'react'
import axios from 'axios'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const acceptedFormats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.aac']

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile)
      setError('')
      setTranscription('')
    } else {
      setError('Por favor, sube un archivo de audio válido')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      setTranscription('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Por favor, selecciona un archivo de audio')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError('')
    setTranscription('')

    const formData = new FormData()
    formData.append('audio', file)

    let progressInterval: NodeJS.Timeout | null = null

    try {
      // Simulamos progreso mientras procesamos
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await axios.post('/api/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      })

      if (progressInterval) clearInterval(progressInterval)
      setProgress(100)

      // Descargar el PDF automáticamente
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${file.name.split('.')[0]}_transcripcion.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      setTranscription('✅ Transcripción completada y PDF descargado exitosamente')
      
      // Reset después de 3 segundos
      setTimeout(() => {
        setFile(null)
        setProgress(0)
        setIsProcessing(false)
      }, 3000)

    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval)
      setError(err.response?.data?.error || 'Error al procesar el audio. Por favor, intenta nuevamente.')
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            🎙️ Transcripción de Audio
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Convierte tus archivos de audio a texto usando IA
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-3 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }
                ${file ? 'bg-green-50 dark:bg-green-900/20 border-green-400' : ''}
              `}
            >
              <input
                type="file"
                accept={acceptedFormats.join(',')}
                onChange={handleFileChange}
                className="hidden"
                id="audio-upload"
                disabled={isProcessing}
              />
              
              <label htmlFor="audio-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center space-y-4">
                  {file ? (
                    <>
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setFile(null)
                        }}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Cambiar archivo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          Arrastra tu archivo aquí
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          o haz clic para seleccionar
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Formatos soportados: MP3, MP4, WAV, M4A, OGG, FLAC, WEBM<br/>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          Sin límite de tamaño
                        </span> - Archivos grandes se procesarán en fragmentos
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Procesando...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 animate-pulse-slow">
                  {progress < 30 && '🎵 Analizando el audio...'}
                  {progress >= 30 && progress < 60 && '🤖 Transcribiendo con IA...'}
                  {progress >= 60 && progress < 90 && '📄 Generando PDF...'}
                  {progress >= 90 && '✨ Finalizando...'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || isProcessing}
              className={`
                w-full py-4 px-6 rounded-xl font-semibold text-white text-lg
                transition-all duration-300 transform hover:scale-105
                ${!file || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                '🚀 Transcribir Audio'
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 text-center">
                ❌ {error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {transcription && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 text-center">
                {transcription}
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Rápido</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Procesamiento con IA</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Preciso</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">OpenAI Whisper</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Responsive</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Funciona en móvil</p>
          </div>
        </div>
      </div>
    </main>
  )
}
