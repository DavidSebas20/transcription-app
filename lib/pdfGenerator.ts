import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Función para limpiar texto de caracteres no soportados por WinAnsi
function cleanTextForPDF(text: string): string {
  // Eliminar cualquier carácter que no sea ASCII imprimible extendido (compatible con WinAnsi)
  // WinAnsi soporta códigos 32-126 (ASCII básico) y 160-255 (Latin-1 Supplement)
  // Esto incluye letras con tildes en español, pero excluye cirílico, árabe, chino, etc.
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

export async function generatePDF(
  fileName: string,
  transcription: string
): Promise<Uint8Array> {
  // Limpiar la transcripción de caracteres no soportados
  const cleanTranscription = cleanTextForPDF(transcription)
  const cleanFileName = cleanTextForPDF(fileName)

  // Crear documento PDF
  const pdfDoc = await PDFDocument.create()
  
  // Cargar fuente estándar
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Configuración de página
  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const maxWidth = pageWidth - (margin * 2)
  const fontSize = 11
  const titleFontSize = 20
  const lineHeight = fontSize * 1.5

  // Obtener fecha actual
  const now = new Date()
  const fecha = now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Función para agregar nueva página
  const addPage = () => {
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    return page
  }

  // Primera página
  let page = addPage()
  let yPosition = pageHeight - margin - 30

  // Título
  page.drawText('Transcripción de Audio', {
    x: margin,
    y: yPosition,
    size: titleFontSize,
    font: boldFont,
    color: rgb(0.18, 0.20, 0.25),
  })
  yPosition -= 40

  // Nombre del archivo
  page.drawText(cleanFileName, {
    x: margin,
    y: yPosition,
    size: 14,
    font: font,
    color: rgb(0.37, 0.51, 0.67),
  })
  yPosition -= 25

  // Fecha
  page.drawText(`Generado el: ${fecha}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  })
  yPosition -= 40

  // Línea separadora
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPosition -= 30

  // Función para dividir texto en líneas que caben en el ancho
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, fontSize)

      if (width <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }

    if (currentLine) lines.push(currentLine)
    return lines
  }

  // Procesar transcripción (usando el texto limpio)
  const paragraphs = cleanTranscription.split('\n').filter(p => p.trim())

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, maxWidth)

    for (const line of lines) {
      // Si no hay espacio, crear nueva página
      if (yPosition < margin + 50) {
        page = addPage()
        yPosition = pageHeight - margin
      }

      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      })

      yPosition -= lineHeight
    }

    // Espacio entre párrafos
    yPosition -= lineHeight * 0.5
  }

  // Agregar números de página
  const pages = pdfDoc.getPages()
  const totalPages = pages.length

  pages.forEach((page, index) => {
    const pageNumber = `Página ${index + 1} de ${totalPages}`
    const textWidth = font.widthOfTextAtSize(pageNumber, 9)
    
    page.drawText(pageNumber, {
      x: (pageWidth - textWidth) / 2,
      y: 30,
      size: 9,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    })

    page.drawText('Generado con OpenAI Whisper', {
      x: (pageWidth - font.widthOfTextAtSize('Generado con OpenAI Whisper', 8)) / 2,
      y: 18,
      size: 8,
      font: font,
      color: rgb(0.7, 0.7, 0.7),
    })
  })

  // Generar PDF
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
