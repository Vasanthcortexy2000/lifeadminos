import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
}

/**
 * Extract text from an image file using Tesseract.js OCR.
 * Returns the extracted text along with confidence score.
 */
export async function extractTextFromImage(file: File): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        // Log progress for debugging (optional)
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    // Consider OCR successful if we got meaningful text
    const success = text.length > 20 && confidence > 40;

    return {
      text,
      confidence,
      success,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return {
      text: '',
      confidence: 0,
      success: false,
    };
  }
}

/**
 * Check if a file is an image type we support for OCR.
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  
  const hasImageType = imageTypes.includes(file.type.toLowerCase());
  const hasImageExtension = imageExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasImageType || hasImageExtension;
}
