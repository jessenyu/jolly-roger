import { z } from 'zod';
import type { ModelType } from './Model';
import Model from './Model';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const DocumentSchema = withCommon(z.object({
  hunt: foreignKey,
  puzzle: foreignKey,
}).and(z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('google'),
    value: z.object({
      type: z.enum(['spreadsheet', 'document']),
      id: nonEmptyString,
      folder: nonEmptyString.optional(),
    }),
  }),
])));

const Documents = new Model('jr_documents', DocumentSchema);
export type DocumentType = ModelType<typeof Documents>;

export default Documents;
