import { GoogleGenAI } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import type { ExtractBlock, KnowledgeEntryDraft } from './types';
import {
  normalizeRelatedTopics,
  normalizeTopicName,
  parseJsonResponse,
} from './utils';

export const geminiApiKey = defineSecret('GEMINI_API_KEY');

const model = 'gemini-3-flash-preview';

const knowledgeEntrySchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      claim: { type: 'string' },
      topic: { type: 'string' },
      related_topics: {
        type: 'array',
        items: { type: 'string' },
      },
      source: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          line_start: { type: 'integer' },
          line_end: { type: 'integer' },
        },
        required: ['page', 'line_start', 'line_end'],
      },
    },
    required: ['claim', 'topic', 'related_topics', 'source'],
  },
} as const;

const answerSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    cited_entry_ids: {
      type: 'array',
      items: { type: 'string' },
    },
    knowledge_gap: { type: 'boolean' },
  },
  required: ['answer', 'cited_entry_ids', 'knowledge_gap'],
} as const;

const lineArraySchema = {
  type: 'array',
  items: { type: 'string' },
} as const;

function createClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: geminiApiKey.value(),
  });
}

export async function compileKnowledgeEntries(
  blocks: ExtractBlock[],
): Promise<KnowledgeEntryDraft[]> {
  if (blocks.length === 0) {
    return [];
  }

  const ai = createClient();
  const prompt = [
    'You are a knowledge compiler for a personal knowledge base.',
    'Read the provided source excerpts carefully.',
    'Extract every meaningful claim, fact, definition, rule, or insight.',
    'Each output item must have:',
    '- claim: concise rewrite of the knowledge',
    '- topic: short canonical topic name',
    '- related_topics: array of related topic names',
    '- source: exact page, line_start, and line_end copied from one provided excerpt',
    'Return only valid JSON matching the schema.',
    '',
    JSON.stringify(
      blocks.map((block) => ({
        page: block.page,
        line_start: block.lineStart,
        line_end: block.lineEnd,
        text: block.text,
      })),
    ),
  ].join('\n');

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: knowledgeEntrySchema,
      temperature: 0,
    },
  });

  const parsed = parseJsonResponse<KnowledgeEntryDraft[]>(response.text ?? '[]');

  return parsed
    .map((entry) => ({
      claim: entry.claim.trim(),
      topic: normalizeTopicName(entry.topic),
      related_topics: normalizeRelatedTopics(entry.related_topics ?? []),
      source: {
        page: Number(entry.source?.page ?? 0),
        line_start: Number(entry.source?.line_start ?? 0),
        line_end: Number(entry.source?.line_end ?? 0),
      },
    }))
    .filter(
      (entry) =>
        entry.claim.length > 0 &&
        entry.topic.length > 0 &&
        Number.isFinite(entry.source.page) &&
        Number.isFinite(entry.source.line_start) &&
        Number.isFinite(entry.source.line_end),
    );
}

export async function summarizeTopic(
  topicName: string,
  claims: string[],
): Promise<string> {
  if (claims.length === 0) {
    return '';
  }

  const ai = createClient();
  const prompt = [
    `Summarize the topic "${topicName}" for a personal wiki.`,
    'Write 2 short paragraphs with high information density.',
    'Use only the supplied claims.',
    'Do not include bullets or markdown.',
    '',
    JSON.stringify(claims.slice(0, 80)),
  ].join('\n');

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  });

  return (response.text ?? '').trim();
}

export async function answerQuestion(params: {
  question: string;
  topicNames: string[];
  entries: Array<{
    id: string;
    claim: string;
    topic: string;
    source: { page: number; line_start: number; line_end: number };
  }>;
}): Promise<{ answer: string; cited_entry_ids: string[]; knowledge_gap: boolean }> {
  const ai = createClient();

  const prompt = [
    'You are answering a question against a curated personal knowledge base.',
    'Use only the provided knowledge entries.',
    'If the entries do not answer the question well, say so clearly and set knowledge_gap to true.',
    'Only cite entry ids that are present in the provided entries.',
    'Return only valid JSON matching the schema.',
    '',
    JSON.stringify({
      question: params.question,
      topic_names: params.topicNames,
      entries: params.entries,
    }),
  ].join('\n');

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: answerSchema,
      temperature: 0.2,
    },
  });

  return parseJsonResponse<{
    answer: string;
    cited_entry_ids: string[];
    knowledge_gap: boolean;
  }>(response.text ?? '{}');
}

export async function transcribeImageToLines(params: {
  mediaType: 'image/png' | 'image/jpeg';
  base64: string;
}): Promise<string[]> {
  const ai = createClient();

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType: params.mediaType,
          data: params.base64,
        },
      },
      {
        text: 'Transcribe all legible text from this image in reading order. Return a JSON array of plain text lines only. Do not summarize.',
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: lineArraySchema,
      temperature: 0,
    },
  });

  const parsed = parseJsonResponse<string[]>(response.text ?? '[]');
  return parsed.map((line) => line.trim()).filter((line) => line.length > 0);
}
