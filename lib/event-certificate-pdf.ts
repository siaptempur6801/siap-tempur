import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { getCertificateAchievementLabel, getCertificateTitle, type EventCertificateKind } from '@/lib/event-certificates'
import { logger } from '@/lib/logger'

export type CertificateRenderInput = {
    certificateNumber: string
    certificateName: string
    eventTitle: string
    certificateKind: EventCertificateKind
    rank: number | null
    score: number | null
    isPassed?: boolean | null
    issuedAt: string
    verifyUrl: string
}

const PAGE_WIDTH = 1684
const PAGE_HEIGHT = 1190
const PDF_WIDTH = 842
const PDF_HEIGHT = 595

/**
 * Font sertifikat, di-bundle bersama aplikasi.
 *
 * KENAPA DI-BUNDLE, BUKAN FONT SISTEM
 *   Sebelumnya SVG memakai `font-family="Poppins, Arial, sans-serif"` dan `Resvg` dibuat
 *   TANPA konfigurasi font, sehingga resvg mencari font lewat fontconfig.
 *   Akibatnya berbeda tajam antar environment:
 *
 *     - di macOS (pengembangan) Arial ada → sertifikat tampil normal;
 *     - di Vercel Linux (produksi) Arial TIDAK ada → seluruh teks sertifikat
 *       tidak tergambar, hanya tersisa bentuk dan garis.
 *
 *   Itu persis gejala "text dan nama tidak muncul" di produksi. Sekarang font
 *   ikut ter-deploy sehingga hasilnya sama di mana pun.
 *
 * Keluarga Poppins dipilih karena itu tipografi brand SiapTempur (lihat
 * `app/layout.tsx` dan design system), sehingga sertifikat konsisten dengan
 * seluruh permukaan aplikasi. Lisensi OFL ada di `public/fonts/OFL.txt`.
 */
const CERTIFICATE_FONT_FAMILY = 'Poppins'
const CERTIFICATE_FONT_FILES = [
    path.join(process.cwd(), 'public', 'fonts', 'Poppins-Regular.ttf'),
    path.join(process.cwd(), 'public', 'fonts', 'Poppins-Bold.ttf'),
    path.join(process.cwd(), 'public', 'fonts', 'Poppins-Black.ttf'),
]

/**
 * Memuat font ke daftar yang diberikan resvg.
 *
 * Berkas yang hilang DILEWATI dengan peringatan alih-alih melempar: sertifikat
 * yang seluruhnya gagal dirender lebih buruk daripada sertifikat yang sebagian
 * teksnya memakai font cadangan. Namun kegagalan ini harus terlihat di log,
 * bukan diam-diam.
 */
async function loadCertificateFontFiles(): Promise<string[]> {
    const available: string[] = []
    for (const [index, file] of CERTIFICATE_FONT_FILES.entries()) {
        try {
            await readFile(file)
            available.push(file)
        } catch {
            logger.warn('[certificate-pdf] Font sertifikat tidak ditemukan', {
                font: CERTIFICATE_FONT_FILES[index],
                resolvedPath: file,
            })
        }
    }

    return available
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function formatIssuedDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

function nameFontSize(name: string) {
    if (name.length > 42) return 58
    if (name.length > 32) return 68
    return 78
}

function wrapText(value: string, maxChars: number) {
    const words = value.trim().split(/\s+/)
    const lines: string[] = []
    let current = ''

    for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (next.length > maxChars && current) {
            lines.push(current)
            current = word
        } else {
            current = next
        }
    }

    if (current) lines.push(current)
    return lines.slice(0, 2)
}

function achievementBadgeWidth(label: string) {
    if (label.includes('Skor:')) return 430
    if (label.length > 14) return 280
    return 148
}

function achievementBadgeFontSize(label: string) {
    if (label.includes('Skor:')) return 23
    return 25
}

function fileDataUri(file: Buffer, mimeType: string) {
    return `data:${mimeType};base64,${file.toString('base64')}`
}

function buildCertificateSvg(input: CertificateRenderInput, logoUri: string, signatureUri: string) {
    const title = getCertificateTitle(input.certificateKind)
    const achievementLabel = getCertificateAchievementLabel({
        kind: input.certificateKind,
        rank: input.rank,
        score: input.score,
        isPassed: input.isPassed,
    })
    const eventLines = wrapText(input.eventTitle, 62)
    const issuedDate = formatIssuedDate(input.issuedAt)
    const certName = escapeXml(input.certificateName)
    const achievementWidth = achievementBadgeWidth(achievementLabel)
    const achievementX = 842 - achievementWidth / 2
    const achievementFontSize = achievementBadgeFontSize(achievementLabel)

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="12" dy="12" stdDeviation="0" flood-color="#05070c" flood-opacity="1"/>
    </filter>
    <pattern id="dotGrid" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#1463ff" opacity=".12"/>
    </pattern>
  </defs>
  <rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#fffdf7"/>
  <path d="M0 0h${PAGE_WIDTH}v${PAGE_HEIGHT}H0z" fill="#fffdf7" stroke="#15214c" stroke-width="10"/>
  <path d="M10 40h1664v1106H10z" fill="url(#dotGrid)" opacity=".9"/>
  <rect x="0" y="0" width="${PAGE_WIDTH}" height="40" fill="#15214c"/>
  <rect x="0" y="1146" width="${PAGE_WIDTH}" height="44" fill="#15214c"/>
  <path d="M1178 40h506v278l-650-54z" fill="#ffdc1f"/>
  <image href="${logoUri}" x="88" y="108" width="420" height="108" preserveAspectRatio="xMinYMid meet"/>
  <text x="548" y="136" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="900" fill="#1463ff" letter-spacing="8">OFFICIAL EVENT</text>
  <text x="548" y="176" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="700" fill="#101828">Tryout SKD CPNS</text>
  <path d="M80 270h1526" stroke="#15214c" stroke-width="8"/>
  <rect x="1318" y="132" width="246" height="72" fill="#05070c"/>
  <rect x="1312" y="124" width="246" height="72" fill="#1463ff" stroke="#15214c" stroke-width="5"/>
  <text x="1435" y="169" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="900" fill="#ffffff" letter-spacing="5">E-CERTIFICATE</text>
  <rect x="790" y="342" width="104" height="104" fill="#05070c"/>
  <rect x="782" y="334" width="104" height="104" fill="#ffdc1f" stroke="#15214c" stroke-width="7"/>
  <circle cx="834" cy="378" r="18" fill="none" stroke="#15214c" stroke-width="5"/>
  <path d="M820 396l-10 30 24-12 24 12-10-30" fill="none" stroke="#15214c" stroke-width="5" stroke-linejoin="round"/>
  <text x="842" y="530" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="58" font-weight="900" fill="#101828" letter-spacing="11">${escapeXml(title.toUpperCase())}</text>
  <text x="842" y="612" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="24" font-weight="900" fill="#667085" letter-spacing="4">DIBERIKAN KEPADA</text>
  <text x="842" y="704" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="${nameFontSize(input.certificateName)}" font-weight="900" fill="#101828">${certName}</text>
  <rect x="196" y="746" width="1292" height="8" fill="#ffdc1f"/>
  <text x="842" y="815" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700" fill="#344054">Atas partisipasi dan pencapaian pada event ${eventLines.length === 1 ? escapeXml(eventLines[0]) : ''}</text>
  ${eventLines.length > 1 ? eventLines.map((line, index) => `<text x="842" y="${860 + index * 38}" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="900" fill="#101828">${escapeXml(line)}</text>`).join('\n  ') : ''}
  <rect x="${achievementX}" y="882" width="${achievementWidth}" height="66" fill="#eef6ff" stroke="#15214c" stroke-width="4"/>
  <text x="842" y="924" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="${achievementFontSize}" font-weight="900" fill="#101828">${escapeXml(achievementLabel)}</text>
  <rect x="92" y="1002" width="8" height="98" fill="#1463ff"/>
  <text x="120" y="1030" font-family="Poppins, Arial, sans-serif" font-size="19" font-weight="900" fill="#101828">Nomor: ${escapeXml(input.certificateNumber)}</text>
  <text x="120" y="1064" font-family="Poppins, Arial, sans-serif" font-size="19" font-weight="700" fill="#475467">Diterbitkan: ${escapeXml(issuedDate)}</text>
  <text x="120" y="1098" font-family="Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#475467">Verifikasi: ${escapeXml(input.verifyUrl)}</text>
  <image href="${signatureUri}" x="1340" y="924" width="214" height="98" preserveAspectRatio="xMidYMid meet"/>
  <path d="M1284 1030h308" stroke="#101828" stroke-width="3"/>
  <text x="1438" y="1068" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="900" fill="#101828">Dirga Halim Susilo</text>
  <text x="1438" y="1100" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="700" fill="#475467">Founder &amp; CEO Siap Tempur</text>
</svg>`
}

function createPdfFromJpeg(jpeg: Buffer) {
    const content = Buffer.from(`q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/Im1 Do\nQ\n`, 'utf8')
    const objects = [
        Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'utf8'),
        Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'utf8'),
        Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`, 'utf8'),
        Buffer.concat([
            Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, 'utf8'),
            jpeg,
            Buffer.from('\nendstream', 'utf8'),
        ]),
        Buffer.concat([
            Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'utf8'),
            content,
            Buffer.from('endstream', 'utf8'),
        ]),
    ]

    const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')]
    const offsets = [0]

    objects.forEach((object, index) => {
        offsets.push(Buffer.concat(chunks).length)
        chunks.push(Buffer.from(`${index + 1} 0 obj\n`, 'utf8'), object, Buffer.from('\nendobj\n', 'utf8'))
    })

    const body = Buffer.concat(chunks)
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (let index = 1; index < offsets.length; index += 1) {
        xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF`

    return new Uint8Array(Buffer.concat([body, Buffer.from(xref, 'utf8')]))
}

export async function createEventCertificateImage(input: CertificateRenderInput) {
    const [logo, signature, fontFiles] = await Promise.all([
        readFile(path.join(process.cwd(), 'public', 'logos', 'siap-tempur-logo-transparent.png')),
        readFile(path.join(process.cwd(), 'public', 'signatures', 'dirga-halim-susilo-transparent.png')),
        loadCertificateFontFiles(),
    ])
    const svg = buildCertificateSvg(input, fileDataUri(logo, 'image/png'), fileDataUri(signature, 'image/png'))

    return Buffer.from(new Resvg(svg, {
        fitTo: {
            mode: 'width',
            value: PAGE_WIDTH,
        },
        font: {
            // Font di-bundle; font sistem tidak diandalkan karena berbeda antar
            // environment (Arial ada di macOS, tidak ada di Vercel Linux).
            loadSystemFonts: false,
            fontFiles,
            defaultFontFamily: CERTIFICATE_FONT_FAMILY,
            sansSerifFamily: CERTIFICATE_FONT_FAMILY,
        },
    }).render().asPng())
}

export async function createEventCertificatePdf(input: CertificateRenderInput) {
    const png = await createEventCertificateImage(input)
    const jpeg = await sharp(png)
        .jpeg({ quality: 94, mozjpeg: true })
        .toBuffer()

    return createPdfFromJpeg(jpeg)
}
