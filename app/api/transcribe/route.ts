import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import os from 'os'
import OpenAI from 'openai'
import { generatePDF } from '@/lib/pdfGenerator'

// Configuración
const MAX_SIZE = 25 * 1024 * 1024 // 25 MB - límite de OpenAI
const CHUNK_SIZE = 20 * 1024 * 1024 // 20 MB por chunk

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Runtime configuration
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutos máximo

// Formatos soportados por OpenAI Whisper
const SUPPORTED_FORMATS = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']

// Función para verificar si el formato es soportado
function isSupportedFormat(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  return SUPPORTED_FORMATS.includes(ext)
}

// Función para dividir archivo MP3 en chunks
async function splitMP3IntoChunks(filePath: string, fileSize: number): Promise<string[]> {
  const numChunks = Math.ceil(fileSize / CHUNK_SIZE)
  const chunks: string[] = []

  const fileBuffer = await readFile(filePath)
  const extension = path.extname(filePath)

  console.log(`✂️ Dividiendo archivo en ${numChunks} fragmentos...`)

  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, fileSize)
    const chunkBuffer = fileBuffer.slice(start, end)
    
    const chunkPath = path.join(
      os.tmpdir(),
      `chunk_${i}_${Date.now()}${extension}`
    )
    
    await writeFile(chunkPath, chunkBuffer)
    chunks.push(chunkPath)
    console.log(`  ✓ Fragmento ${i + 1}/${numChunks}: ${(chunkBuffer.length / 1024 / 1024).toFixed(2)} MB`)
  }

  return chunks
}

// Función para transcribir con OpenAI
async function transcribeAudio(filePath: string): Promise<string> {
  const fs = require('fs')
  const audioStream = fs.createReadStream(filePath)

  // Whisper-1 es el único modelo disponible, pero optimizamos con configuración
  const transcription = await openai.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-1', // Único modelo disponible ($0.006/minuto)
    response_format: 'text', // Formato más simple y eficiente
    language: 'es', // Especificar idioma ahorra procesamiento
    temperature: 0, // Más determinista, menos procesamiento
  })

  return transcription as string
}

// Función principal de procesamiento
async function processAudioFile(filePath: string, fileSize: number, originalName: string): Promise<string> {
  console.log(`📁 Procesando archivo: ${originalName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)

  // Verificar si el formato es soportado
  if (!isSupportedFormat(originalName)) {
    const ext = path.extname(originalName).toLowerCase()
    throw new Error(
      `Formato ${ext} no soportado. Por favor, convierte tu audio a MP3 primero usando un convertidor online.`
    )
  }

  const transcriptions: string[] = []
  const chunksToClean: string[] = []

  try {
    // Si el archivo es menor a 25 MB, transcribir directamente
    if (fileSize <= MAX_SIZE) {
      console.log('🎙️ Archivo dentro del límite, transcribiendo directamente...')
      const transcription = await transcribeAudio(filePath)
      transcriptions.push(transcription)
    } else {
      // Archivo grande: dividir en chunks
      console.log(`⚠️ Archivo supera ${MAX_SIZE / 1024 / 1024} MB, dividiendo en fragmentos...`)
      
      const chunks = await splitMP3IntoChunks(filePath, fileSize)
      chunksToClean.push(...chunks)

      // Transcribir cada chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🎙️ Transcribiendo fragmento ${i + 1}/${chunks.length}...`)
        
        try {
          const chunkTranscription = await transcribeAudio(chunks[i])
          transcriptions.push(chunkTranscription)
          console.log(`  ✓ Fragmento ${i + 1} completado`)
        } catch (error: any) {
          console.error(`❌ Error en fragmento ${i + 1}:`, error.message)
          
          // Detener el proceso completo si falla un fragmento
          throw new Error(
            `Falló la transcripción del fragmento ${i + 1}/${chunks.length}. ` +
            `Error: ${error.message}. El proceso se ha detenido.`
          )
        }
      }
    }

    // Combinar todas las transcripciones
    const fullTranscription = transcriptions.join('\n\n')
    
    if (fullTranscription.trim().length === 0) {
      throw new Error('No se pudo obtener ninguna transcripción del audio')
    }
    
    console.log('✅ Transcripción completada exitosamente')
    return fullTranscription
    
  } finally {
    // Limpiar chunks temporales
    for (const chunk of chunksToClean) {
      await unlink(chunk).catch(() => {})
    }
  }
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null
  
  try {
    console.log('🚀 Iniciando procesamiento de audio...')

    // Verificar API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API Key de OpenAI no configurada' },
        { status: 500 }
      )
    }

    // Obtener el archivo del formulario
    const formData = await req.formData()
    const file = formData.get('audio') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se encontró el archivo de audio' },
        { status: 400 }
      )
    }

    console.log(`� Archivo: ${file.name} (${file.size} bytes)`)

    // Guardar el archivo temporalmente
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const tempDir = os.tmpdir()
    tempFilePath = path.join(tempDir, `upload_${Date.now()}_${file.name}`)
    await writeFile(tempFilePath, buffer)

    // Procesar el audio
    const transcription = await processAudioFile(tempFilePath, file.size, file.name)

    // Generar PDF
    console.log('📄 Generando PDF...')
    const pdfBytes = await generatePDF(file.name, transcription)

    // Retornar el PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}_transcripcion.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('❌ Error:', error)
    
    // Limpiar archivo temporal si existe
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {})
    }
    
    return NextResponse.json(
      { error: error.message || 'Error al procesar el audio' },
      { status: 500 }
    )
  }
}
