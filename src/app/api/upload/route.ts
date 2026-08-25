import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/lib/auth';
import { jsonError } from '@/lib/api-utils';
import { isAcceptedContentType } from '@/lib/blob';

// Issues a signed token for a direct client → Vercel Blob upload — the file
// bytes never pass through this route. See "File upload" in docs/ARCHITECTURE.md.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (clientPayload && !isAcceptedContentType(clientPayload)) {
          throw new Error('Unsupported file type');
        }
        return {
          allowedContentTypes: ['image/*', 'application/pdf'],
          tokenPayload: JSON.stringify({ userId: session.user!.id }),
        };
      },
      onUploadCompleted: async () => {
        // Attachment rows are created explicitly by the client once it has
        // the resulting blob URL — see POST /api/items/[id]/attachments.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return jsonError(400, err instanceof Error ? err.message : 'Upload failed');
  }
}
