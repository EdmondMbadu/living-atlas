import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { transcribeImageToLines } from './gemini';
import { fetchHtmlWithFallback } from './html-fetch';
import { groupLinesIntoBlocks } from './utils';
import type { ExtractBlock, SupportedFileType } from './types';

type PdfTextItem = { str?: string };
type PdfPageData = {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
};

async function extractPdf(buffer: Buffer): Promise<ExtractBlock[]> {
  const pageTexts: string[] = [];

  await pdf(buffer, {
    pagerender: async (pageData: PdfPageData) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str ?? '').join('\n');
      pageTexts.push(text);
      return text;
    },
  });

  return pageTexts.flatMap((pageText, index) =>
    groupLinesIntoBlocks(pageText.split(/\r?\n/), index + 1),
  );
}

async function extractDocx(buffer: Buffer): Promise<ExtractBlock[]> {
  const result = await mammoth.extractRawText({ buffer });
  return groupLinesIntoBlocks(result.value.split(/\r?\n/), 1);
}

async function extractPptx(buffer: Buffer): Promise<ExtractBlock[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const blocks: ExtractBlock[] = [];

  for (const slideName of slideNames) {
    const xml = await zip.files[slideName]?.async('text');
    if (!xml) {
      continue;
    }

    const slideNumber = Number(slideName.match(/slide(\d+)\.xml$/i)?.[1] ?? '1');
    const texts = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map((match) =>
      decodeXmlEntities(match[1] ?? ''),
    );
    blocks.push(...groupLinesIntoBlocks(texts, slideNumber));
  }

  return blocks;
}

async function extractPlainText(buffer: Buffer): Promise<ExtractBlock[]> {
  return groupLinesIntoBlocks(buffer.toString('utf8').split(/\r?\n/), 1);
}

async function extractUrl(url: string): Promise<{ title: string | null; blocks: ExtractBlock[] }> {
  const response = await fetchHtmlWithFallback(url, { timeoutMs: 60_000 });

  if (response.status >= 400) {
    throw new Error(`Failed to fetch URL (${response.status}).`);
  }

  const dom = new JSDOM(response.html, { url: response.finalUrl || url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = article?.textContent?.trim() ?? dom.window.document.body?.textContent?.trim() ?? '';

  return {
    title: article?.title?.trim() || null,
    blocks: groupLinesIntoBlocks(text.split(/\r?\n/), 1),
  };
}

async function extractImage(
  buffer: Buffer,
  fileType: 'png' | 'jpg' | 'jpeg',
): Promise<ExtractBlock[]> {
  const base64 = buffer.toString('base64');
  const lines = await transcribeImageToLines({
    mediaType: fileType === 'png' ? 'image/png' : 'image/jpeg',
    base64,
  });

  return groupLinesIntoBlocks(lines, 1);
}

export async function extractBlocksFromBuffer(
  fileType: SupportedFileType,
  buffer: Buffer,
): Promise<{ blocks: ExtractBlock[]; title?: string | null }> {
  switch (fileType) {
    case 'pdf':
      return { blocks: await extractPdf(buffer) };
    case 'docx':
      return { blocks: await extractDocx(buffer) };
    case 'pptx':
      return { blocks: await extractPptx(buffer) };
    case 'txt':
    case 'md':
      return { blocks: await extractPlainText(buffer) };
    case 'png':
    case 'jpg':
    case 'jpeg':
      return { blocks: await extractImage(buffer, fileType) };
    case 'doc':
      throw new Error('Legacy .doc files are not yet supported. Convert to .docx and re-upload.');
    case 'ppt':
      throw new Error('Legacy .ppt files are not yet supported. Convert to .pptx and re-upload.');
    case 'url':
      throw new Error('URL extraction requires a URL source, not a file buffer.');
    default:
      throw new Error(`Unsupported file type: ${String(fileType)}`);
  }
}

export async function extractBlocksFromUrl(url: string): Promise<{
  title: string | null;
  blocks: ExtractBlock[];
}> {
  return extractUrl(url);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
