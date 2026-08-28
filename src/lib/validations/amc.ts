import { z } from 'zod';

const amcContractFields = z.object({
  provider: z.string().trim().min(1, 'Provider is required').max(200),
  cost: z.number().nonnegative().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  documentBlobUrl: z.string().url().optional().nullable(),
  documentFileName: z.string().min(1).optional().nullable(),
  documentMimeType: z.string().min(1).optional().nullable(),
  documentSizeBytes: z.number().int().positive().optional().nullable(),
});

function documentFieldsTogether(v: {
  documentBlobUrl?: string | null;
  documentFileName?: string | null;
  documentMimeType?: string | null;
  documentSizeBytes?: number | null;
}) {
  const doc = [v.documentBlobUrl, v.documentFileName, v.documentMimeType, v.documentSizeBytes];
  return doc.every((f) => f == null) || doc.every((f) => f != null);
}

const documentTogetherRefinement = {
  message: 'Document fields must be provided together or not at all',
};

export const createAmcContractSchema = amcContractFields.refine(documentFieldsTogether, documentTogetherRefinement);

export const updateAmcContractSchema = amcContractFields.partial().refine(documentFieldsTogether, documentTogetherRefinement);
