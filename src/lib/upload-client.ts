import { upload } from '@vercel/blob/client';

export interface UploadedFile {
  blobUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  type: 'PHOTO' | 'RECEIPT' | 'WARRANTY' | 'AMC_DOCUMENT';
}

// Uploads directly from the browser to Vercel Blob via a signed token from
// /api/upload — the file bytes never pass through our server. See "File
// upload" in docs/ARCHITECTURE.md.
export async function uploadFile(file: File, type: UploadedFile['type']): Promise<UploadedFile> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: file.type,
  });
  return { blobUrl: blob.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, type };
}
