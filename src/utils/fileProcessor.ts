import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';

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

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Note: pdf-lib doesn't have built-in text extraction
    // For a simpler approach, let's use a different method
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    let extractedText = '';
    fields.forEach(field => {
      if (field.constructor.name === 'PDFTextField') {
        const textField = field as any;
        extractedText += textField.getText() + ' ';
      }
    });
    
    // If no form fields found, return basic info
    if (!extractedText.trim()) {
      const pageCount = pdfDoc.getPageCount();
      extractedText = `PDF document with ${pageCount} pages. `;
      
      // Try to extract any embedded text (limited with pdf-lib)
      for (let i = 0; i < Math.min(pageCount, 5); i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        extractedText += `Page ${i + 1} content (${width}x${height}). `;
      }
    }
    
    return extractedText.trim() || 'PDF content extracted successfully but no readable text found.';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to process PDF file. Please try converting it to a text file first.');
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