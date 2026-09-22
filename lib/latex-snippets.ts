import { insertAtSelection } from '@/lib/question-media'

/**
 * Snippet LaTeX siap pakai untuk penulis soal.
 *
 * Sintaks yang dirender `MathRenderer`: `$...$` untuk rumus inline dan `$$...$$`
 * untuk rumus blok (ditampilkan di baris sendiri). `cursorBack` menempatkan
 * kursor di dalam `{}` agar penulis bisa langsung mengetik isinya.
 */
export type LatexSnippet = {
    /** Teks tombol (unicode pendek, mis. `a/b`, `√`, `x²`). */
    label: string
    /** Nama untuk tooltip & aria-label. */
    title: string
    /** Teks yang disisipkan ke textarea, sudah termasuk pembungkus `$`/`$$`. */
    insert: string
    /** LaTeX murni tanpa pembungkus — dipakai editor visual (node rumus). */
    latex: string
    /** True bila rumus blok (`$$…$$`). */
    block: boolean
    /** Karakter mundur dari akhir sisipan tempat kursor diletakkan. */
    cursorBack?: number
    /** Snippet lanjutan hanya ditampilkan pada toolbar penuh. */
    advanced?: boolean
}

type LatexSnippetSource = Omit<LatexSnippet, 'latex' | 'block'>

const LATEX_SNIPPET_SOURCE: readonly LatexSnippetSource[] = [
    { label: 'a/b', title: 'Pecahan', insert: '$\\frac{}{}$', cursorBack: 4 },
    { label: '√', title: 'Akar', insert: '$\\sqrt{}$', cursorBack: 2 },
    { label: 'x²', title: 'Pangkat', insert: '$x^{}$', cursorBack: 2 },
    { label: 'xₙ', title: 'Indeks', insert: '$x_{}$', cursorBack: 2 },
    { label: '×', title: 'Kali', insert: '$\\times$' },
    { label: '÷', title: 'Bagi', insert: '$\\div$' },
    { label: '±', title: 'Plus-minus', insert: '$\\pm$' },
    { label: '≤', title: 'Kurang dari sama dengan', insert: '$\\le$' },
    { label: '≥', title: 'Lebih dari sama dengan', insert: '$\\ge$' },
    { label: '≠', title: 'Tidak sama dengan', insert: '$\\ne$' },
    { label: 'π', title: 'Pi', insert: '$\\pi$' },
    { label: 'α', title: 'Alpha', insert: '$\\alpha$' },
    { label: 'θ', title: 'Theta', insert: '$\\theta$' },
    { label: '∞', title: 'Tak hingga', insert: '$\\infty$' },
    { label: '∫', title: 'Integral', insert: '$$\\int_{a}^{b} f(x)\\,dx$$', advanced: true },
    { label: 'Σ', title: 'Sigma', insert: '$$\\sum_{i=1}^{n} a_i$$', advanced: true },
    { label: 'lim', title: 'Limit', insert: '$$\\lim_{x \\to 0} f(x)$$', advanced: true },
    { label: 'matriks', title: 'Matriks 2×2', insert: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$', advanced: true },
]

export const LATEX_SNIPPETS: readonly LatexSnippet[] = LATEX_SNIPPET_SOURCE.map((snippet) => ({
    ...snippet,
    latex: snippet.insert.replace(/^\$+/, '').replace(/\$+$/, ''),
    block: snippet.insert.startsWith('$$'),
}))

/** Snippet yang ditampilkan pada toolbar ringkas (di dalam baris opsi). */
export function compactLatexSnippets(): readonly LatexSnippet[] {
    return LATEX_SNIPPETS.filter((snippet) => !snippet.advanced).slice(0, 6)
}

export function insertLatexSnippet(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    snippet: LatexSnippet,
): { value: string; cursor: number } {
    return insertAtSelection(value, selectionStart, selectionEnd, snippet.insert, snippet.cursorBack ?? 0)
}
