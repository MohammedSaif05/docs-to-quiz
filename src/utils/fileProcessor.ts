import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the PDF.js worker
GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return await extractTextFromDOCX(file);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await extractTextFromTXT(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from file. Please check the file format and try again.');
  }
};

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in (item as Record<string, unknown>);
}

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF with pdfjs-dist
    const loadingTask = getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const numPages: number = pdf.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent: TextContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => (isTextItem(item) ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      if (pageText.trim()) {
        pageTexts.push(pageText.trim());
      }
    }

    const combined = pageTexts.join('\n\n');
    return combined || 'No readable text found in PDF.';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to process PDF file. Try another PDF or convert to DOCX/TXT.');
  }
};

const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to process DOCX file. Please check the file format.');
  }
};

const extractTextFromTXT = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text.trim());
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read text file'));
    };
    
    reader.readAsText(file);
  });
};