export type QuestionContentBlock =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'math'; latex: string }
  | { id: string; type: 'image'; imageUrl: string }
  | { id: string; type: 'spacer'; size: 'sm' | 'md' | 'lg' }

const BLOCK_TOKEN_PATTERN = /(\[\[image:[^\]]+\]\]|\[\[spacer:(?:sm|md|lg)\]\])/g

export function createQuestionBlockId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createDefaultQuestionBlocks(): QuestionContentBlock[] {
  return [{ id: createQuestionBlockId(), type: 'text', text: '' }]
}

export function serializeQuestionBlocks(blocks: QuestionContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === 'text') {
        return block.text.trim()
      }

      if (block.type === 'math') {
        const latex = block.latex.trim()
        return latex ? `$$${latex}$$` : ''
      }

      if (block.type === 'image') {
        const imageUrl = block.imageUrl.trim()
        return imageUrl ? `[[image:${imageUrl}]]` : ''
      }

      return `[[spacer:${block.size}]]`
    })
    .filter(Boolean)
    .join('\n\n')
}

export function legacyQuestionToBlocks(text: string | null | undefined, imageUrl: string | null | undefined): QuestionContentBlock[] {
  const blocks: QuestionContentBlock[] = []
  const legacyImageUrl = imageUrl?.trim()

  if (legacyImageUrl) {
    blocks.push({ id: createQuestionBlockId(), type: 'image', imageUrl: legacyImageUrl })
  }

  const value = text?.trim()
  if (!value) {
    return blocks.length > 0 ? blocks : createDefaultQuestionBlocks()
  }

  const parts = value.split(BLOCK_TOKEN_PATTERN).filter((part) => part.length > 0)

  for (const part of parts) {
    if (part.startsWith('[[image:') && part.endsWith(']]')) {
      const tokenImageUrl = part.slice('[[image:'.length, -2).trim()
      if (tokenImageUrl) {
        blocks.push({ id: createQuestionBlockId(), type: 'image', imageUrl: tokenImageUrl })
      }
      continue
    }

    if (part.startsWith('[[spacer:') && part.endsWith(']]')) {
      const size = part.slice('[[spacer:'.length, -2)
      blocks.push({
        id: createQuestionBlockId(),
        type: 'spacer',
        size: size === 'sm' || size === 'lg' ? size : 'md',
      })
      continue
    }

    const trimmedText = part.trim()
    if (trimmedText) {
      blocks.push({ id: createQuestionBlockId(), type: 'text', text: trimmedText })
    }
  }

  return blocks.length > 0 ? blocks : createDefaultQuestionBlocks()
}
