import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseType, BaseOverrides } from './base';
import { Overrides, inheritSchema, buildSchema } from './typedSchemas';

// We can't represent tagged unions (or possible future tagged unions) in
// SimpleSchema, so we use different types for the actual type vs. the type used
// to derive the schema.
export const DocumentType = t.intersection([
  BaseType,
  t.type({
    hunt: t.string,
    puzzle: t.string,
  }),
  // If we add other providers in the future, turn this into a tagged union on
  // provider
  t.type({
    provider: t.literal('google'),
    value: t.type({
      type: t.union([t.literal('sheets'), t.literal('docs')]),
      id: t.string,
    }),
  }),
]);

const DocumentFields = t.type({
  hunt: t.string,
  puzzle: t.string,
  provider: t.string,
  // This is opaque to the specific provider.
  //
  // For provider=google, this consists of a "type" ("sheets" or
  // "docs") and an id
  value: t.object,
});

const DocumentFieldsOverrides: Overrides<t.TypeOf<typeof DocumentFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  puzzle: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [DocumentSchemaType, DocumentOverrides] = inheritSchema(
  BaseType, DocumentFields,
  BaseOverrides, DocumentFieldsOverrides,
);

const Documents = buildSchema(DocumentSchemaType, DocumentOverrides);

export default Documents;
