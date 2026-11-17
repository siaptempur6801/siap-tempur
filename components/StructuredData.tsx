type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: StructuredDataValue }
  | StructuredDataValue[]

/**
 * Serialisasi JSON-LD yang aman ditanam di `<script>`.
 *
 * `JSON.stringify` tidak meng-escape `<`, sehingga string berisi `</script>`
 * dapat menutup elemen lebih awal. Escape `\u003c` tetap JSON yang sama bagi parser.
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function StructuredData({ data }: { data: StructuredDataValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
