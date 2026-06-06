import { describe, expect, it } from 'vitest'
import {
  legacyQuestionToBlocks,
  serializeQuestionBlocks,
  type QuestionContentBlock,
} from '@/lib/admin-question-blocks'

describe('admin question blocks', () => {
  it('serializes text, math, image, and spacer blocks into legacy-safe content', () => {
    const blocks: QuestionContentBlock[] = [
      { id: 'a', type: 'text', text: 'Baca soal berikut.' },
      { id: 'b', type: 'math', latex: 'x^2 + y^2 = z^2' },
      { id: 'c', type: 'image', imageUrl: 'https://example.com/question.png' },
      { id: 'd', type: 'spacer', size: 'md' },
    ]

    expect(serializeQuestionBlocks(blocks)).toBe(
      'Baca soal berikut.\n\n$$x^2 + y^2 = z^2$$\n\n[[image:https://example.com/question.png]]\n\n[[spacer:md]]'
    )
  })

  it('parses image and spacer tokens back into blocks', () => {
    const blocks = legacyQuestionToBlocks(
      'Intro\n\n[[image:https://example.com/a.png]]\n\n[[spacer:lg]]\n\nSelesai',
      null
    )

    expect(blocks.map((block) => block.type)).toEqual(['text', 'image', 'spacer', 'text'])
  })

  it('keeps legacy image url as an image block before old text', () => {
    const blocks = legacyQuestionToBlocks('Teks lama', 'https://example.com/old.png')

    expect(blocks[0]).toMatchObject({ type: 'image', imageUrl: 'https://example.com/old.png' })
    expect(blocks[1]).toMatchObject({ type: 'text', text: 'Teks lama' })
  })
})
