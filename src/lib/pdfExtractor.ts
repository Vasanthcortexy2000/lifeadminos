import * as pdfjsLib from 'pdfjs-dist';
// IMPORTANT: We must NOT rely on the CDN worker.
// In this environment the CDN worker fetch is failing, which makes *all* PDFs unreadable.
// Using Vite's `?worker` import gives us a bundled Worker and avoids the `?import` CDN path.
// eslint-disable-next-line import/no-named-as-default
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

// Create a single shared worker instance.
// pdf.js will reuse it for subsequent documents.
// (The type is intentionally loose because Vite's worker import type is not declared here.)
pdfjsLib.GlobalWorkerOptions.workerPort = new (PdfWorker as any)();

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    
    return textParts.join('\n\n');
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
