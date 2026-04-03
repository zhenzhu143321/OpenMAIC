#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

function parseArgs(argv) {
  const args = {
    classroomId: '',
    baseUrl: 'http://127.0.0.1:8002',
    imageProvider: 'seedream',
    imageModel: 'doubao-seedream-5-0-260128',
    ttsProvider: 'qwen-tts',
    ttsVoice: 'Cherry',
    ttsSpeed: 1,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--base-url':
        args.baseUrl = argv[++i] || args.baseUrl;
        break;
      case '--image-provider':
        args.imageProvider = argv[++i] || args.imageProvider;
        break;
      case '--image-model':
        args.imageModel = argv[++i] || args.imageModel;
        break;
      case '--tts-provider':
        args.ttsProvider = argv[++i] || args.ttsProvider;
        break;
      case '--tts-voice':
        args.ttsVoice = argv[++i] || args.ttsVoice;
        break;
      case '--tts-speed': {
        const value = Number.parseFloat(argv[++i] || '');
        if (Number.isFinite(value)) args.ttsSpeed = value;
        break;
      }
      default:
        if (!token.startsWith('--') && !args.classroomId) {
          args.classroomId = token;
        }
        break;
    }
  }

  return args;
}

function inferExt(contentType, url) {
  const normalized = (contentType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';

  if (url) {
    const cleanUrl = url.split('?')[0] || url;
    const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) {
      const ext = match[1].toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  }

  return 'png';
}

async function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.classroomId) {
    console.error(
      'Usage: node scripts/backfill-classroom-media.mjs <classroomId> [--base-url http://127.0.0.1:8002]',
    );
    process.exit(1);
  }

  const rootDir = process.cwd();
  const classroomDir = path.join(rootDir, 'data', 'classrooms', args.classroomId);
  const classroomPath = path.join(classroomDir, 'classroom.json');
  const mediaDir = path.join(classroomDir, 'media');
  const classroom = JSON.parse(await fs.readFile(classroomPath, 'utf8'));

  await fs.mkdir(mediaDir, { recursive: true });

  const existingIds = new Set();
  for (const fileName of await fs.readdir(mediaDir).catch(() => [])) {
    existingIds.add(fileName.replace(/\.[^.]+$/, ''));
  }

  let generatedImages = 0;
  let generatedTTS = 0;
  let assignedAudioIds = 0;

  for (const outline of classroom.outlines || []) {
    for (const mediaGeneration of outline.mediaGenerations || []) {
      if (mediaGeneration.type !== 'image') continue;
      if (existingIds.has(mediaGeneration.elementId)) continue;

      console.log(`IMAGE ${mediaGeneration.elementId} :: ${outline.title}`);
      const imageRes = await fetch(`${args.baseUrl}/api/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-image-provider': args.imageProvider,
          'x-image-model': args.imageModel,
        },
        body: JSON.stringify({
          prompt: mediaGeneration.prompt,
          aspectRatio: mediaGeneration.aspectRatio || '16:9',
          style: mediaGeneration.style || undefined,
        }),
      });
      const imagePayload = await imageRes.json().catch(() => ({}));
      const imageResult = imagePayload.result;

      if (!imageRes.ok || !imagePayload.success || !imageResult) {
        throw new Error(
          `Image generation failed for ${mediaGeneration.elementId}: ${JSON.stringify(imagePayload)}`,
        );
      }

      let buffer;
      let ext;
      if (imageResult.base64) {
        buffer = Buffer.from(imageResult.base64, 'base64');
        ext = 'png';
      } else if (imageResult.url) {
        const downloadRes = await fetch(imageResult.url);
        if (!downloadRes.ok) {
          throw new Error(`Failed to download image for ${mediaGeneration.elementId}`);
        }
        buffer = Buffer.from(await downloadRes.arrayBuffer());
        ext = inferExt(downloadRes.headers.get('content-type'), imageResult.url);
      } else {
        throw new Error(`Image result missing payload for ${mediaGeneration.elementId}`);
      }

      await fs.writeFile(path.join(mediaDir, `${mediaGeneration.elementId}.${ext}`), buffer);
      existingIds.add(mediaGeneration.elementId);
      generatedImages += 1;
    }
  }

  for (const scene of classroom.scenes || []) {
    for (const action of scene.actions || []) {
      if (action.type !== 'speech' || !action.text || !action.text.trim()) continue;

      const audioId = action.audioId || `tts_${action.id}`;
      if (!action.audioId) {
        action.audioId = audioId;
        assignedAudioIds += 1;
      }

      if (existingIds.has(audioId)) continue;

      console.log(`TTS ${audioId} :: ${scene.title}`);
      const ttsRes = await fetch(`${args.baseUrl}/api/generate/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: action.text,
          audioId,
          ttsProviderId: args.ttsProvider,
          ttsVoice: args.ttsVoice,
          ttsSpeed: args.ttsSpeed,
        }),
      });
      const ttsPayload = await ttsRes.json().catch(() => ({}));
      if (!ttsRes.ok || !ttsPayload.success || !ttsPayload.base64 || !ttsPayload.format) {
        throw new Error(`TTS generation failed for ${audioId}: ${JSON.stringify(ttsPayload)}`);
      }

      await fs.writeFile(
        path.join(mediaDir, `${audioId}.${ttsPayload.format}`),
        Buffer.from(ttsPayload.base64, 'base64'),
      );
      existingIds.add(audioId);
      generatedTTS += 1;
    }
  }

  await writeJsonAtomic(classroomPath, classroom);

  console.log(
    JSON.stringify(
      {
        classroomId: args.classroomId,
        generatedImages,
        generatedTTS,
        assignedAudioIds,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
