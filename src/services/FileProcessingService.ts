
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Dynamically import the PDF.js worker
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type ProcessedFile = {
  fileName: string;
  fileType: string;
  content: string;
  size: number;
};

export class FileProcessingService {
  /**
   * Process a file and extract its content
   */
  static async processFile(file: File): Promise<ProcessedFile> {
    const fileType = file.type;
    let content = '';

    if (fileType.includes('pdf')) {
      content = await this.extractPdfText(file);
    } else if (fileType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      content = await this.extractDocxText(file);
    } else if (fileType.includes('text') || file.name.endsWith('.txt')) {
      content = await this.extractTextFromTxt(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return {
      fileName: file.name,
      fileType,
      content,
      size: file.size
    };
  }

  /**
   * Extract text from a PDF file
   */
  private static async extractPdfText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => 'str' in item ? item.str : '');
        fullText += strings.join(' ') + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from a DOCX file
   */
  private static async extractDocxText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Extract text from a TXT file
   */
  private static async extractTextFromTxt(file: File): Promise<string> {
    try {
      const text = await file.text();
      return text.trim();
    } catch (error) {
      console.error('Error parsing TXT:', error);
      throw new Error('Failed to extract text from TXT');
    }
  }
}
