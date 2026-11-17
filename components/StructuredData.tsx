type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: StructuredDataValue }
  | StructuredDataValue[]

export default function StructuredData({ data }: { data: StructuredDataValue }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
