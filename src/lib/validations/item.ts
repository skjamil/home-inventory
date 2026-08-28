import { z } from 'zod';
import { createAmcContractSchema } from './amc';

// Only name + category are required — see docs/DESIGN.md's "low friction" principle.
const attachmentInput = z.object({
  blobUrl: z.string().url(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  type: z.enum(['PHOTO', 'RECEIPT', 'WARRANTY']),
});

export const createItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  categoryId: z.string().min(1, 'Category is required'),
  purchaseDate: z.string().datetime().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  warrantyExpiration: z.string().datetime().optional().nullable(),
  serialNumber: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  attachments: z.array(attachmentInput).optional(),
  amcContracts: z.array(createAmcContractSchema).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createAttachmentSchema = attachmentInput;
