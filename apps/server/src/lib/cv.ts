import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function bufferToText(filename: string, buf: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    const data: any = await pdfParse(buf);
    return data.text as string;
  }
  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  return buf.toString('utf8');
}
