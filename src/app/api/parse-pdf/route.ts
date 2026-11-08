import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    const pdfModule = await import('pdf-parse');

    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      text = res.text || '';
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } else {
      const parseFn =
        typeof pdfModule === 'function' ? pdfModule : (pdfModule as any).default;
      if (typeof parseFn === 'function') {
        const data = await parseFn(buffer);
        text = data.text || '';
      } else {
        throw new Error('Unable to parse PDF: pdf-parse not available as class or function');
      }
    }

    // Split by newlines, trim, filter out empty lines & headers
    const rawLines = text.split(/\r?\n/);
    const headerRegex = /^(name|student\s*name|staff\s*name|full\s*name|students|staff|names|kinford)$/i;

    const names = rawLines
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false;
        if (headerRegex.test(line)) return false;
        // Skip page numbers or purely numeric lines
        if (/^\d+$/.test(line)) return false;
        return true;
      });

    return NextResponse.json({ names });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse PDF file';
    console.error('Error parsing PDF:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
