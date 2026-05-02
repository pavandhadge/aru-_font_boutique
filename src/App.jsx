import { useState, useEffect, useRef } from 'react'
import { toPng } from 'html-to-image'

const FONT_LIST = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Playfair Display','Oswald','Raleway','Nunito','Merriweather','Ubuntu','Fira Sans','Arvo','Dancing Script','Crimson Text','Josefin Sans','Libre Baskerville','PT Sans','Quicksand','Source Sans Pro','Nunito Sans','Roboto Condensed','Roboto Mono','Noto Sans','Noto Serif','Inconsolata','Fira Code','JetBrains Mono','Source Code Pro','DM Sans','DM Serif Display','Bebas Neue','Abril Fatface','Vollkorn','Cardo','Cormorant Garamond','EB Garamond','Spectral','Domine','Frank Ruhl Libre','Neuton','Bitter','Tinos','Old Standard TT','Alegreya','Lora','Crimson Pro','Zilla Slab','Karma','Bellota','Caveat','Pacifico','Satisfy','Kaushan Script','Courgette','Cookie','Allura','Parisienne','Great Vibes','Sacramento','Yellowtail','Shadows Into Light','Handlee','Comic Neue','Patrick Hand','Schoolbell','Gochi Hand','Indie Flower','Amatic SC','Permanent Marker','Caveat Brush','Balsamiq Sans','Architects Daughter','Shadows Into Light Two','Over the Rainbow','Covered By Your Grace','Gloria Hallelujah','Kalam','Nothing You Could Do','Waiting for the Sunrise','Rock Salt','Meddon','Fascinate','Fascinate Inline','Bonbon','Miltonian','Miltonian Tattoo','Mrs Sheppards','Paprika','Ruthie','Tangerine','Zhi Mang Xing','Liu Jian Mao Cao','ZCOOL XiaoWei','Ma Shan Zheng','Long Cang','ZCOOL QingKe HuangYou','ZCOOL KuaiLe','Josefin Slab','Aleo','Andada Pro','Andika','Averia Libre','Averia Sans Libre','Averia Serif Libre','Cabin','Cabin Condensed','Cantarell','Chivo','Eczar','Exo 2','Figtree','Gelasio','Glegoo','Heebo','Hind','Hind Madurai','Hind Siliguri','IBM Plex Sans','IBM Plex Serif','IBM Plex Mono','Space Mono','Space Grotesk','Work Sans','Yanone Kaffeesatz','Barlow','Barlow Condensed','Barlow Semi Condensed','Bree Serif','Cairo','Didact Gothic','Faustina','Gafata','Hammersmith One','Kanit','Krub','Mada','Marmelad','Miriam Libre','Mukta','Nanum Gothic','Nanum Myeongjo','Noto Sans KR','Noto Serif KR','Noto Sans JP','Noto Serif JP','Oxygen','Padauk','Pathway Gothic One','Pragati Narrow','Prompt','Rajdhani','Rokkitt','Signika','Sintony','Sriracha','Teko','Titillium Web','Trispace','Ubuntu Condensed','Varela','Varela Round','Vesper Libre','Volkhov','Yantramanav','Athiti','Bai Jamjuree','Bowlby One','Bowler','Bungee','Bungee Inline','Bungee Outline','Bungee Shade','Chonburi','Chakra Petch','Dekko','Dhurjati','Gayathri','Gudea','Itim','Jaldi','Khand','Kodchasan','Kurale','Lakki Reddy','Mali','Martel','Martel Sans','Mitra Mono','Molengo','Moul','Moulpali','Nunito Sans','Pattaya','Pavanam','Peddana','Poiret One','Poll','Puritan','Raghu Malayalam','Rasa','Rozha One','Sarala','Sarpan','Shrikhand','Sree Krushnadevaraya','Suranna','Suravaram','Tenali Ramakrishna','Thasadith','Tillana','Timmana','Tomorrow','Udan','Uriel','Viga','Vimala','Wendy One','Yatra One'
]

// Deduplicate the font list so each font appears only once
const UNIQUE_FONT_LIST = [...new Set(FONT_LIST)]

const fontCssCache = new Map()
const fontFileCache = new Map()

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function fetchFontFileAsDataUrl(url) {
  if (fontFileCache.has(url)) return fontFileCache.get(url)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch font file: ${url}`)
  const dataUrl = await blobToDataUrl(await response.blob())
  fontFileCache.set(url, dataUrl)
  return dataUrl
}

async function embedFontUrls(cssText) {
  const matches = [...cssText.matchAll(/url\((https:\/\/[^)]+)\)/g)]
  let embeddedCss = cssText

  await Promise.all(
    matches.map(async ([match, url]) => {
      const dataUrl = await fetchFontFileAsDataUrl(url)
      embeddedCss = embeddedCss.replaceAll(match, `url(${dataUrl})`)
    }),
  )

  return embeddedCss
}

async function getFontEmbedCss(fonts) {
  const uniqueFonts = [...new Set(fonts.filter(Boolean))]
  const chunks = await Promise.all(
    uniqueFonts.map(async (fontName) => {
      if (fontCssCache.has(fontName)) return fontCssCache.get(fontName)

      const family = fontName.replace(/ /g, '+')
      const response = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`)
      if (!response.ok) throw new Error(`Failed to fetch font CSS: ${fontName}`)

      const cssText = await embedFontUrls(await response.text())
      fontCssCache.set(fontName, cssText)
      return cssText
    }),
  )

  return chunks.join('\n')
}

async function downloadElementAsPng(element, filename, fonts = [], isCard = false) {
  if (!element) return

  await document.fonts?.ready
  const fontEmbedCSS = await getFontEmbedCss(['Bangers', 'Cherry Bomb One', 'Mali', 'Patrick Hand', ...fonts])
  
  // Apply generous padding for the exports
  const padding = isCard ? 40 : 60;

  const dataUrl = await toPng(element, {
    cacheBust: true,
    fontEmbedCSS,
    pixelRatio: 2,
    backgroundColor: '#fff6d7',
    width: element.offsetWidth + (padding * 2),
    height: element.offsetHeight + (padding * 2),
    style: {
      margin: `${padding}px`,
      overflow: 'visible',
    },
    filter: (node) => {
      if (node.tagName === 'BUTTON') return false;
      if (node.nodeType === 1 && node.classList.contains('panel-actions')) return false;
      return true;
    },
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}

function Doodle({ type }) {
  if (type === 'none') return null

  return (
    <svg className={`doodle-svg doodle-${type}`} viewBox="0 0 120 120" aria-hidden="true">
      {type === 'bow' && (
        <>
          <path d="M55 58C33 28 13 30 10 55c-3 27 24 29 45 9Z" />
          <path d="M65 58c22-30 42-28 45-3 3 27-24 29-45 9Z" />
          <circle cx="60" cy="61" r="13" />
          <path d="M22 45c8 3 16 9 24 17M98 45c-8 3-16 9-24 17" className="doodle-line" />
        </>
      )}
      {type === 'heart' && (
        <>
          <path d="M60 99S18 72 16 41c-1-17 18-26 31-13 5 5 13 5 18 0 13-13 32-4 31 13-2 31-36 58-36 58Z" />
          <path d="M35 43c5-9 15-10 22-2M76 37c7-5 16-2 20 6" className="doodle-line" />
        </>
      )}
      {type === 'spark' && (
        <>
          <path d="M60 8 72 45l40 15-40 15-12 37-12-37L8 60l40-15Z" />
          <path d="M88 14v24M76 26h24M28 78v18M19 87h18" className="doodle-line" />
        </>
      )}
      {type === 'star' && (
        <>
          <path d="m60 10 13 34 37 2-29 23 10 36-31-20-31 20 10-36-29-23 37-2Z" />
          <path d="m49 55 11-28 11 28M44 74l16-9 16 9" className="doodle-line" />
        </>
      )}
      {type === 'cloud' && (
        <>
          <path d="M31 83c-16 0-25-10-22-24 2-12 13-19 25-16 7-20 36-24 48-5 15-2 29 8 30 23 0 14-10 22-26 22Z" />
          <path d="M30 61c10-11 24-9 31 1 9-12 27-12 37 0" className="doodle-line" />
        </>
      )}
      {type === 'flower' && (
        <>
          <circle cx="60" cy="60" r="13" />
          <path d="M60 13c14 12 14 26 0 35-14-9-14-23 0-35ZM60 107c-14-12-14-26 0-35 14 9 14 23 0 35ZM13 60c12-14 26-14 35 0-9 14-23 14-35 0ZM107 60c-12 14-26 14-35 0 9-14 23-14 35 0ZM26 26c18 0 28 10 25 27-17 3-27-7-25-27ZM94 26c0 18-10 28-27 25-3-17 7-27 27-25ZM26 94c0-18 10-28 27-25 3 17-7 27-27 25ZM94 94c-18 0-28-10-25-27 17-3 27 7 25 27Z" />
        </>
      )}
      {type === 'ribbon' && (
        <>
          <path d="M31 13h58v94L60 84l-29 23Z" />
          <path d="M42 29h36M42 45h36M60 84V13" className="doodle-line" />
        </>
      )}
      {type === 'gem' && (
        <>
          <path d="M27 20h66l19 31-52 57L8 51Z" />
          <path d="M27 20 45 51l15-31 15 31 18-31M8 51h104M45 51l15 57 15-57" className="doodle-line" />
        </>
      )}
      {type === 'moon' && (
        <>
          <path d="M83 101C43 96 19 60 35 26c5-10 13-17 22-21-8 23-2 51 18 68 11 9 24 13 38 12-7 10-17 16-30 16Z" />
          <path d="m82 23 5 12 13 4-13 5-5 12-5-12-13-5 13-4Z" />
        </>
      )}
      {type === 'pearl' && (
        <>
          <circle cx="39" cy="65" r="23" />
          <circle cx="74" cy="47" r="28" />
          <circle cx="82" cy="80" r="18" />
          <path d="M30 55c6-8 15-11 25-8M64 35c9-8 24-8 34 2" className="doodle-line" />
        </>
      )}
      {type === 'kiss' && (
        <>
          <path d="M14 63c19-32 38-33 46-9 11-22 33-23 47 8-25 29-66 31-93 1Z" />
          <path d="M17 63c30 10 60 10 90-1M40 50c6 6 13 8 20 4M72 53c8 4 16 3 24-3" className="doodle-line" />
        </>
      )}
      {type === 'crown' && (
        <>
          <path d="M14 94h92V39L82 61 60 18 38 61 14 39Z" />
          <path d="M25 94V72h70v22M38 61l22 11 22-11" className="doodle-line" />
        </>
      )}
      {type === 'butterfly' && (
        <>
          <path d="M57 57C39 20 14 20 11 48c-2 25 25 32 46 15Z" />
          <path d="M63 57c18-37 43-37 46-9 2 25-25 32-46 15Z" />
          <path d="M57 66C38 91 18 87 19 68c1-16 21-18 38-7ZM63 66c19 25 39 21 38 2-1-16-21-18-38-7Z" />
          <path d="M60 52v42M48 24c-4-8-10-12-18-14M72 24c4-8 10-12 18-14" className="doodle-line" />
        </>
      )}
      {type === 'bowtie' && (
        <>
          <path d="M55 61C33 39 14 38 9 58c-5 23 19 25 46 8Z" />
          <path d="M65 61c22-22 41-23 46-3 5 23-19 25-46 8Z" />
          <rect x="49" y="49" width="22" height="25" rx="8" />
        </>
      )}
      {type === 'swirl' && (
        <>
          <path d="M60 12c34 0 52 28 43 55-9 30-45 45-72 25-23-17-19-49 5-60 19-9 43 4 43 25 0 18-20 29-35 18-10-8-8-22 2-28" className="doodle-line doodle-thick" />
          <circle cx="46" cy="47" r="8" />
        </>
      )}
      {type === 'cherry' && (
        <>
          <circle cx="43" cy="77" r="23" />
          <circle cx="78" cy="82" r="21" />
          <path d="M46 55c6-26 18-39 38-45M80 61c-3-19 3-34 21-45M78 14c-16-2-26 5-30 20 16 4 28-2 30-20Z" className="doodle-line" />
        </>
      )}
      {type === 'shell' && (
        <>
          <path d="M16 96c5-44 21-70 44-83 23 13 39 39 44 83Z" />
          <path d="M60 13v83M37 29l15 67M83 29 68 96M25 55l21 41M95 55 74 96" className="doodle-line" />
        </>
      )}
      {type === 'wand' && (
        <>
          <path d="M34 108 91 51" className="doodle-line doodle-thick" />
          <path d="m81 8 9 27 28 8-28 9-9 28-9-28-28-9 28-8Z" />
          <path d="M28 19v18M19 28h18M94 91v18M85 100h18" className="doodle-line" />
        </>
      )}
      {type === 'locket' && (
        <>
          <path d="M60 105S21 77 21 47c0-23 25-35 39-15 14-20 39-8 39 15 0 30-39 58-39 58Z" />
          <circle cx="60" cy="52" r="16" />
          <path d="M60 36V16M49 16h22" className="doodle-line" />
        </>
      )}
      {type === 'lipstick' && (
        <>
          <path d="M42 104h38V48H42Z" />
          <path d="M49 48h24V22c-10 3-18 11-24 26Z" />
          <path d="M38 104h46v12H38ZM42 72h38" className="doodle-line" />
        </>
      )}
      {type === 'perfume' && (
        <>
          <path d="M36 47h48l12 19v39H24V66Z" />
          <path d="M48 29h24v18H48ZM42 18h36M60 66c13 8 22 16 22 25H38c0-9 9-17 22-25Z" className="doodle-line" />
        </>
      )}
      {type === 'clover' && (
        <>
          <path d="M60 55C41 31 20 38 22 58c2 17 22 20 38 1Z" />
          <path d="M60 55c19-24 40-17 38 3-2 17-22 20-38 1Z" />
          <path d="M60 61c-19 24-40 17-38-3 2-17 22-20 38-1Z" />
          <path d="M60 61c19 24 40 17 38-3-2-17-22-20-38-1ZM60 68c-4 18-13 30-28 38" className="doodle-line" />
        </>
      )}
      {type === 'camera' && (
        <>
          <path d="M18 43h24l9-13h25l9 13h17v58H18Z" />
          <circle cx="60" cy="72" r="20" />
          <circle cx="91" cy="55" r="5" />
          <path d="M42 43h36" className="doodle-line" />
        </>
      )}
    </svg>
  )
}

const CARD_STYLES = [
  { className: 'panel-blush card-tall card-arch texture-dot', icon: 'bow', tag: 'sweet' },
  { className: 'panel-mint card-short card-ticket texture-plaid', icon: 'heart', tag: 'fresh' },
  { className: 'panel-butter card-medium card-soft texture-ray', icon: 'spark', tag: 'sunny' },
  { className: 'panel-lilac card-tall card-stamp texture-dot', icon: 'star', tag: 'dreamy' },
  { className: 'panel-sky card-short card-arch texture-cloud', icon: 'cloud', tag: 'soft' },
  { className: 'panel-peach card-medium card-ticket texture-plaid', icon: 'flower', tag: 'cute' },
  { className: 'panel-cream card-widefeel card-soft texture-ray', icon: 'ribbon', tag: 'polished' },
  { className: 'panel-rose card-short card-stamp texture-dot', icon: 'gem', tag: 'pretty' },
  { className: 'panel-latte card-tall card-frame texture-lace', icon: 'moon', tag: 'atelier' },
  { className: 'panel-aqua card-medium card-label texture-wave', icon: 'pearl', tag: 'glossy' },
  { className: 'panel-powder card-short card-soft texture-bloom', icon: 'kiss', tag: 'flirty' },
  { className: 'panel-lemon card-tall card-ticket texture-grid', icon: 'crown', tag: 'main pop' },
  { className: 'panel-orchid card-medium card-scallop texture-sparkle', icon: 'butterfly', tag: 'coquette' },
  { className: 'panel-vanilla card-short card-folder texture-ribbon', icon: 'bowtie', tag: 'diary' },
  { className: 'panel-seafoam card-tall card-postcard texture-stamp', icon: 'swirl', tag: 'fresh cut' },
  { className: 'panel-candy card-medium card-badge texture-heartbeat', icon: 'cherry', tag: 'crush' },
]

const DOODLE_OPTIONS = [
  'bow', 'heart', 'spark', 'star', 'cloud', 'flower', 'ribbon', 'gem', 'moon', 'pearl',
  'kiss', 'crown', 'butterfly', 'bowtie', 'swirl', 'cherry', 'shell', 'wand', 'locket',
  'lipstick', 'perfume', 'clover', 'camera', 'none',
]

const STICKER_OPTIONS = [
  { value: 'none', label: 'No sticker' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'love', label: 'Love note' },
  { value: 'cute', label: 'Cute seal' },
  { value: 'wow', label: 'Wow pop' },
  { value: 'ribbon', label: 'Ribbon tab' },
  { value: 'pearl', label: 'Pearl dot' },
  { value: 'gloss', label: 'Glossy heart' },
  { value: 'stamp', label: 'Post stamp' },
  { value: 'tape', label: 'Washi tape' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'charm', label: 'Charm' },
  { value: 'badge', label: 'Badge' },
]

const BACKDROP_OPTIONS = [
  { value: 'default', label: 'Style default' },
  { value: 'pearls', label: 'Pearls' },
  { value: 'lace', label: 'Lace' },
  { value: 'hearts', label: 'Hearts' },
  { value: 'stars', label: 'Stars' },
  { value: 'bows', label: 'Bows' },
  { value: 'glitter', label: 'Glitter mist' },
  { value: 'scrapbook', label: 'Scrapbook' },
]

const RECOMMENDATION_PRESETS = {
  cute: ['Cherry Bomb One', 'Mali', 'Patrick Hand', 'Comic Neue', 'Balsamiq Sans', 'Gochi Hand', 'Schoolbell', 'Itim', 'Bellota', 'Handlee', 'Indie Flower', 'Kalam'],
  doodle: ['Gochi Hand', 'Schoolbell', 'Indie Flower', 'Architects Daughter', 'Covered By Your Grace', 'Gloria Hallelujah', 'Shadows Into Light', 'Caveat Brush', 'Patrick Hand', 'Handlee', 'Kalam', 'Comic Neue'],
  romantic: ['Dancing Script', 'Pacifico', 'Satisfy', 'Cookie', 'Parisienne', 'Great Vibes', 'Sacramento', 'Allura', 'Courgette', 'Yellowtail', 'Caveat', 'Mali'],
  loud: ['Bangers', 'Shrikhand', 'Bungee', 'Bowlby One', 'Permanent Marker', 'Fascinate Inline', 'Bebas Neue', 'Chonburi', 'Wendy One', 'Viga', 'Passion One', 'Teko'],
  elegant: ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Libre Baskerville', 'Lora', 'Cardo', 'Spectral', 'EB Garamond', 'Crimson Pro', 'Bitter', 'Alegreya', 'Domine'],
  clean: ['Poppins', 'Quicksand', 'Nunito', 'DM Sans', 'Figtree', 'Space Grotesk', 'Work Sans', 'Varela Round', 'Josefin Sans', 'Montserrat', 'Cabin', 'Signika'],
  code: ['JetBrains Mono', 'Fira Code', 'Space Mono', 'Roboto Mono', 'Inconsolata', 'Source Code Pro', 'IBM Plex Mono', 'Trispace', 'Tomorrow', 'Courier Prime', 'Mitra Mono', 'Anonymous Pro'],
}

function uniqueExisting(fonts) {
  return [...new Set(fonts)].filter((font) => UNIQUE_FONT_LIST.includes(font))
}

function getRecommendations(value) {
  const normalized = value.toLowerCase()
  const words = normalized.split(/\s+/).filter(Boolean)
  const has = (...terms) => terms.some((term) => normalized.includes(term))

  if (has('love', 'heart', 'wedding', 'romantic', 'kiss', 'date', 'dear')) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.romantic, ...RECOMMENDATION_PRESETS.cute])
  }

  if (has('sale', 'wow', 'boom', 'party', 'crazy', 'bold', 'comic', 'pow', 'poster') || value.includes('!')) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.loud, ...RECOMMENDATION_PRESETS.cute])
  }

  if (has('luxury', 'brand', 'editorial', 'fashion', 'classic', 'serif', 'elegant')) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.elegant, ...RECOMMENDATION_PRESETS.clean])
  }

  if (has('code', 'dev', 'api', 'terminal', 'function', 'const', 'debug')) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.code, ...RECOMMENDATION_PRESETS.clean])
  }

  if (has('doodle', 'sketch', 'handmade', 'scrapbook', 'sticker', 'journal')) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.doodle, ...RECOMMENDATION_PRESETS.cute])
  }

  if (words.length <= 3 && value.trim().length > 0) {
    return uniqueExisting([...RECOMMENDATION_PRESETS.loud, ...RECOMMENDATION_PRESETS.clean])
  }

  return uniqueExisting([...RECOMMENDATION_PRESETS.cute, ...RECOMMENDATION_PRESETS.doodle, ...RECOMMENDATION_PRESETS.clean])
}

const loadedFonts = new Set()

function loadFont(fontName) {
  if (loadedFonts.has(fontName)) return
  loadedFonts.add(fontName)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`
  document.head.appendChild(link)
}

function getFontFamily(fontName) {
  return `'${fontName}', system-ui, sans-serif`
}

export default function App() {
  const [text, setText] = useState('Make it cute, loud, and soft all at once!')
  const [search, setSearch] = useState('')
  const [manualFonts, setManualFonts] = useState([])
  const [hiddenFonts, setHiddenFonts] = useState([])
  const [weight, setWeight] = useState(400)
  const [sortBy, setSortBy] = useState('alphabetical') // Default to alphabetical for cleaner browsing
  const [panelCount, setPanelCount] = useState(12)
  const [cardEdits, setCardEdits] = useState({})
  const [editingFont, setEditingFont] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const boardRef = useRef(null)
  const cardRefs = useRef({})
  const editorPreviewRef = useRef(null)

  const downloadBoard = async () => {
    if (!boardRef.current) return
    try {
      setIsExporting(true)
      await downloadElementAsPng(boardRef.current, 'font-board', boardFonts, false)
    } catch (error) {
      console.error('Board download failed', error)
    } finally {
      setIsExporting(false)
    }
  }

  const downloadCard = async (font) => {
    const cardEl = cardRefs.current[font]
    if (!cardEl) return
    try {
      setIsExporting(true)
      
      let elementToDownload = cardEl
      let originalTilt = cardEl.style.getPropertyValue('--tilt')
      
      if (editingFont === font && editorPreviewRef.current) {
        elementToDownload = editorPreviewRef.current
        originalTilt = elementToDownload.style.getPropertyValue('--tilt')
      }
      
      elementToDownload.style.setProperty('--tilt', '0deg')

      await downloadElementAsPng(elementToDownload, font.replace(/\s+/g, '-').toLowerCase(), [font], true)

      elementToDownload.style.setProperty('--tilt', originalTilt)
    } catch (error) {
      console.error('Card download failed', error)
    } finally {
      setIsExporting(false)
    }
  }

  const suggestedFonts = getRecommendations(text)
  const boardFonts = [
    ...manualFonts,
    ...suggestedFonts.filter((font) => !manualFonts.includes(font) && !hiddenFonts.includes(font)),
  ].slice(0, panelCount)
  const bestFont = boardFonts[0]

  useEffect(() => {
    ;['Bangers', 'Cherry Bomb One', 'Patrick Hand', 'Mali', 'Shrikhand', ...boardFonts].forEach(loadFont)
  }, [boardFonts])

  const addFont = (font) => {
    setHiddenFonts((prev) => prev.filter((item) => item !== font))
    setManualFonts((prev) => (prev.includes(font) ? prev : [font, ...prev]).slice(0, panelCount))
  }

  const removeFont = (font) => {
    setManualFonts((prev) => prev.filter((item) => item !== font))
    setHiddenFonts((prev) => (prev.includes(font) ? prev : [...prev, font]))
  }

  const resetSuggestions = () => {
    setManualFonts([])
    setHiddenFonts([])
  }

  const updateCardEdit = (font, patch) => {
    setCardEdits((prev) => ({
      ...prev,
      [font]: {
        ...prev[font],
        ...patch,
      },
    }))
  }

  const resetCardEdit = (font) => {
    setCardEdits((prev) => {
      const next = { ...prev }
      delete next[font]
      return next
    })
  }

  const goNutsOnCard = (font) => {
    const seed = font.length + text.length
    updateCardEdit(font, {
      styleIndex: seed % CARD_STYLES.length,
      tag: ['main girl', 'dreamy', 'soft drama', 'poster babe', 'love note'][seed % 5],
      weight: seed % 2 === 0 ? 700 : 400,
      scale: 1 + ((seed % 5) * 0.08),
      doodle: DOODLE_OPTIONS[seed % (DOODLE_OPTIONS.length - 1)],
      sticker: STICKER_OPTIONS[(seed % (STICKER_OPTIONS.length - 1)) + 1].value,
      backdrop: BACKDROP_OPTIONS[(seed % (BACKDROP_OPTIONS.length - 1)) + 1].value,
    })
  }

  const sortedFonts = [...UNIQUE_FONT_LIST]
    .filter((font) => font.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'alphabetical') return a.localeCompare(b)
      const aSelected = boardFonts.includes(a)
      const bSelected = boardFonts.includes(b)
      if (aSelected !== bSelected) return bSelected ? 1 : -1
      return a.localeCompare(b)
    })

  return (
    <main className="comic-page">
      <section className="cover-panel" aria-label="Font preview controls">
        <div className="sticker sticker-one">kawaii fonts</div>
        <div className="sticker sticker-two">pow!</div>

        <p className="eyebrow">Pastel Comic Studio</p>
        <h1>Font Match</h1>
        <p className="intro">
          Type your line. The board recommends fonts that fit the vibe.
        </p>

        <label className="speech-card preview-editor">
          <span>Type text to style</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            aria-label="Preview text"
          />
        </label>

        <div className="recommendation-note">
          <span>Best pick</span>
          <strong>{bestFont ?? 'Type something first'}</strong>
          <small>Basic vibe matching for now: cute, loud, romantic, elegant, clean, or code.</small>
        </div>

        <div className="control-row">
          <button
            type="button"
            className={weight === 400 ? 'pill active' : 'pill'}
            onClick={() => setWeight(400)}
          >
            Soft
          </button>
          <button
            type="button"
            className={weight === 700 ? 'pill active' : 'pill'}
            onClick={() => setWeight(700)}
          >
            Bold pop
          </button>
          <span className="selected-count">{boardFonts.length} suggested</span>
        </div>

        <details className="tool-card">
          <summary>Advanced font controls</summary>
          <div className="advanced-drawer">
            <div className="advanced-grid">
              <label>
                <span>Search fonts</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try Shrikhand, Mali, Caveat..."
                />
              </label>

              <label>
                <span>Board size</span>
                <select value={panelCount} onChange={(event) => setPanelCount(Number(event.target.value))}>
                  <option value={8}>8 recommendations</option>
                  <option value={12}>12 recommendations</option>
                  <option value={18}>18 recommendations</option>
                </select>
              </label>

              <label>
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="alphabetical">A to Z</option>
                  <option value="selected">On board first</option>
                </select>
              </label>
            </div>

            <div className="button-grid">
              <button type="button" onClick={resetSuggestions}>
                Suggestions
              </button>
              <button type="button" onClick={() => { setManualFonts([]); setHiddenFonts(UNIQUE_FONT_LIST); }}>
                Clear
              </button>
              <button type="button" onClick={() => setWeight((w) => (w === 400 ? 700 : 400))}>
                {weight === 400 ? 'Make Bold' : 'Make Normal'}
              </button>
            </div>

            <div className="font-picker-panel">
              <div className="font-picker-title">
                <span>All available fonts</span>
                <strong>{sortedFonts.length}</strong>
              </div>
              <div 
                className="font-chip-cloud" 
                aria-label="All available fonts" 
                style={{ 
                  maxHeight: '350px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignContent: 'flex-start',
                  gap: '8px',
                  padding: '4px' 
                }}
              >
                {sortedFonts.map((font) => {
                  const isSelected = boardFonts.includes(font)
                  return (
                    <button
                      type="button"
                      key={font}
                      onClick={() => (isSelected ? removeFont(font) : addFont(font))}
                      className={isSelected ? 'font-chip selected' : 'font-chip'}
                    >
                      {font}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="gallery-panel" aria-label="Selected font previews">
        <div className="gallery-header">
          <div>
            <p className="eyebrow">Pinterest board</p>
            <h2>Suggested Looks</h2>
          </div>
          <button
            type="button"
            className="download-board-btn"
            onClick={downloadBoard}
            disabled={boardFonts.length === 0 || isExporting}
          >
            {isExporting ? 'Preparing...' : 'Download board'}
          </button>
        </div>

        <div className="board-scroll">
          {boardFonts.length === 0 ? (
            <div className="empty-panel">
              <span>oops!</span>
              <p>Use suggestions again or add fonts from advanced controls.</p>
            </div>
          ) : (
          <div className="comic-grid" ref={boardRef}>
            {boardFonts.map((font, index) => {
              const edit = cardEdits[font] ?? {}
              const style = CARD_STYLES[edit.styleIndex ?? index % CARD_STYLES.length]
              const doodle = edit.doodle ?? style.icon
              const sticker = edit.sticker ?? 'none'
              const backdrop = edit.backdrop ?? 'default'
              const tilt = index === 0 ? '0deg' : `${((index * 2) % 7) - 3}deg`
              return (
                <article
                  key={font}
                  ref={(node) => {
                    if (node) cardRefs.current[font] = node
                  }}
                  className={`font-panel ${style.className} bg-${backdrop} ${index === 0 ? 'top-pick' : ''}`}
                  style={{ '--tilt': tilt, '--card-scale': edit.scale ?? 1 }}
                >
                  {sticker !== 'none' && <div className={`card-sticker sticker-${sticker}`} aria-hidden="true" />}
                  <Doodle type={doodle} />
                  <div className="panel-topline">
                    <span>{edit.tag || (index === 0 ? 'top pick' : style.tag)}</span>
                    <div className="panel-actions">
                      <button type="button" onClick={() => setEditingFont(font)} aria-label={`Edit ${font}`}>
                        edit
                      </button>
                      <button type="button" onClick={() => downloadCard(font)} aria-label={`Download ${font}`}>
                        ↓
                      </button>
                      <button type="button" onClick={() => removeFont(font)} aria-label={`Remove ${font}`}>
                        x
                      </button>
                    </div>
                  </div>
                  <h3>{font}</h3>
                  <p style={{ fontFamily: getFontFamily(font), fontWeight: edit.weight ?? weight }}>{text}</p>
                </article>
              )
            })}
          </div>
          )}
        </div>
      </section>

      {editingFont && (
        <div className="card-editor-backdrop" role="dialog" aria-modal="true" aria-label={`Edit ${editingFont} card`}>
          <div className="card-editor">
            <div className="editor-copy">
              <p className="eyebrow">Card stylist</p>
              <h2>{editingFont}</h2>
              <p>Customize this one suggestion without changing the full board.</p>
            </div>

            <div className="editor-preview-wrap" ref={editorPreviewRef}>
              {(() => {
                const edit = cardEdits[editingFont] ?? {}
                const previewStyle = CARD_STYLES[edit.styleIndex ?? boardFonts.indexOf(editingFont) % CARD_STYLES.length]
                const previewDoodle = edit.doodle ?? previewStyle.icon
                const previewSticker = edit.sticker ?? 'none'
                const previewBackdrop = edit.backdrop ?? 'default'
                return (
                  <article
                    className={`font-panel editor-preview ${previewStyle.className} bg-${previewBackdrop}`}
                    style={{ '--tilt': '0deg', '--card-scale': edit.scale ?? 1 }}
                  >
                    {previewSticker !== 'none' && <div className={`card-sticker sticker-${previewSticker}`} aria-hidden="true" />}
                    <Doodle type={previewDoodle} />
                    <div className="panel-topline">
                      <span>{edit.tag || previewStyle.tag}</span>
                    </div>
                    <h3>{editingFont}</h3>
                    <p style={{ fontFamily: getFontFamily(editingFont), fontWeight: edit.weight ?? weight }}>{text}</p>
                  </article>
                )
              })()}
            </div>

            <div className="editor-controls">
              <label>
                <span>Card style</span>
                <select
                  value={cardEdits[editingFont]?.styleIndex ?? boardFonts.indexOf(editingFont) % CARD_STYLES.length}
                  onChange={(event) => updateCardEdit(editingFont, { styleIndex: Number(event.target.value) })}
                >
                  {CARD_STYLES.map((style, index) => (
                    <option key={style.className} value={index}>
                      {style.tag}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Card label</span>
                <input
                  value={cardEdits[editingFont]?.tag ?? ''}
                  onChange={(event) => updateCardEdit(editingFont, { tag: event.target.value })}
                  placeholder="top pick, dreamy, brand crush..."
                />
              </label>

              <label>
                <span>Card weight</span>
                <select
                  value={cardEdits[editingFont]?.weight ?? weight}
                  onChange={(event) => updateCardEdit(editingFont, { weight: Number(event.target.value) })}
                >
                  <option value={400}>Soft</option>
                  <option value={700}>Bold pop</option>
                </select>
              </label>

              <label>
                <span>Doodle shape</span>
                <select
                  value={cardEdits[editingFont]?.doodle ?? CARD_STYLES[cardEdits[editingFont]?.styleIndex ?? boardFonts.indexOf(editingFont) % CARD_STYLES.length].icon}
                  onChange={(event) => updateCardEdit(editingFont, { doodle: event.target.value })}
                >
                  {DOODLE_OPTIONS.map((doodle) => (
                    <option key={doodle} value={doodle}>
                      {doodle}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sticker</span>
                <select
                  value={cardEdits[editingFont]?.sticker ?? 'none'}
                  onChange={(event) => updateCardEdit(editingFont, { sticker: event.target.value })}
                >
                  {STICKER_OPTIONS.map((sticker) => (
                    <option key={sticker.value} value={sticker.value}>
                      {sticker.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Background extras</span>
                <select
                  value={cardEdits[editingFont]?.backdrop ?? 'default'}
                  onChange={(event) => updateCardEdit(editingFont, { backdrop: event.target.value })}
                >
                  {BACKDROP_OPTIONS.map((backdrop) => (
                    <option key={backdrop.value} value={backdrop.value}>
                      {backdrop.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Text drama</span>
                <input
                  type="range"
                  min="0.84"
                  max="1.4"
                  step="0.04"
                  value={cardEdits[editingFont]?.scale ?? 1}
                  onChange={(event) => updateCardEdit(editingFont, { scale: Number(event.target.value) })}
                />
              </label>
            </div>

            <div className="editor-actions">
              <button type="button" onClick={() => goNutsOnCard(editingFont)}>
                Go nuts
              </button>
              <button type="button" onClick={() => resetCardEdit(editingFont)}>
                Reset card
              </button>
              <button type="button" onClick={() => downloadCard(editingFont)}>
                Download
              </button>
              <button type="button" onClick={() => setEditingFont(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}