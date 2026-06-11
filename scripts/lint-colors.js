// Three checks: (1) banned color references in source files, (2) banned
// Tailwind utility classes in Vue templates, (3) theme-file token parity.
// Fail messages below describe each rule when triggered.

const { execSync } = require('child_process')
const { log, error } = require('console')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'frontend', 'src')
const stylesheetsDir = path.join(root, 'ui-components', 'stylesheets')
const lightThemeFile = path.join(stylesheetsDir, 'ff-theme-light.scss')
const darkThemeFile = path.join(stylesheetsDir, 'ff-theme-dark.scss')

// Check 1 — banned color references in CSS-property values
const SCSS_ALIASES = '\\$ff-(black|white|grey-|red-|blue-|indigo-|yellow-|green-|teal-|color--)'
const COLOR_PROPERTIES = '(color|background|background-color|border|border-color|border-top|border-bottom|border-left|border-right|border-top-color|border-bottom-color|border-left-color|border-right-color|fill|stroke|outline|outline-color|box-shadow|caret-color|text-decoration-color)'
const HEX_COLOR_IN_PROPERTY = `${COLOR_PROPERTIES}:[^;]*#[0-9A-Fa-f]{3,8}\\b`
const NAMED_COLOR_IN_PROPERTY = `${COLOR_PROPERTIES}:[^;]*[^a-zA-Z0-9_-](white|black)\\b`
const PALETTE_IN_PROPERTY = `${COLOR_PROPERTIES}:[^;]*var\\(--ff-palette-`
const SVG_ATTR_BAD = '(fill|stroke)="(var\\(--ff-palette-|#[0-9A-Fa-f]{3,8}\\b|(white|black|gray|grey|red|blue|green|yellow|orange|purple|pink|teal|indigo)\\b)'
const BANNED_PATTERN = `(${SCSS_ALIASES})|(${HEX_COLOR_IN_PROPERTY})|(${NAMED_COLOR_IN_PROPERTY})|(${PALETTE_IN_PROPERTY})|(${SVG_ATTR_BAD})`
const ALLOWLIST_FILES = /(ff-colors|ff-palette|ff-theme-light|ff-theme-dark|ff-highlight-js)\.scss$/
const ALLOW_HEX_COMMENT = /\/\/\s*allow-hex:/

function checkBannedReferences () {
    let raw = ''
    try {
        raw = execSync(
            `grep -rnE '${BANNED_PATTERN}' --include='*.scss' --include='*.vue' --include='*.css' "${root}"`,
            { encoding: 'utf8' }
        )
    } catch (e) {
        if (e.status === 1) return []
        throw e
    }
    return raw
        .split('\n')
        .filter(Boolean)
        .filter(line => !ALLOWLIST_FILES.test(line.split(':')[0]))
        .filter(line => !ALLOW_HEX_COMMENT.test(line))
}

// Check 2 — banned Tailwind utility classes in templates
const BANNED_TAILWIND_CLASSES = '\\b(bg-black|text-(red|yellow|blue|green|indigo|teal|purple|gray|grey)-(50|100|200))\\b'
const TAILWIND_IN_TEMPLATE = `(:?class)\\s*=\\s*"[^"]*${BANNED_TAILWIND_CLASSES}[^"]*"`

function checkTemplateClasses () {
    let raw = ''
    try {
        raw = execSync(
            `grep -rnE '${TAILWIND_IN_TEMPLATE}' --include='*.vue' "${root}"`,
            { encoding: 'utf8' }
        )
    } catch (e) {
        if (e.status === 1) return []
        throw e
    }
    return raw.split('\n').filter(Boolean)
}

// Check 3 — theme-file parity
function extractTokens (filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const tokens = new Set()
    const re = /^\s*(--ff-color-[a-z0-9-]+)\s*:/gm
    let match
    while ((match = re.exec(content)) !== null) {
        tokens.add(match[1])
    }
    return tokens
}

function checkThemeParity () {
    const lightTokens = extractTokens(lightThemeFile)
    const darkTokens = extractTokens(darkThemeFile)
    const missingFromDark = [...lightTokens].filter(t => !darkTokens.has(t)).sort()
    const missingFromLight = [...darkTokens].filter(t => !lightTokens.has(t)).sort()
    return { missingFromDark, missingFromLight }
}

function run () {
    let failed = false

    const banned = checkBannedReferences()
    if (banned.length > 0) {
        failed = true
        error('')
        error('— Banned color references —')
        error('')
        error('Source files must reference colors via CSS variables so the bundle')
        error('remains runtime-themable and whitelabel-ready:')
        error('')
        error('  prefer  var(--ff-color-text)                 (semantic intent)')
        error('  or      var(--ff-palette-grey-700)           (raw palette)')
        error('  avoid   $ff-grey-700, $ff-color--action      (banned SCSS aliases)')
        error('  avoid   color: #374151;                       (banned hex literals)')
        error('  avoid   background: white; / color: black;     (banned named-color keywords)')
        error('  avoid   var(--ff-palette-*) in any color property — palette is static.')
        error('  avoid   fill="..." / stroke="..." with hex/palette/named-color in SVGs.')
        error('')
        error('Per-line escape only for genuine fixed-decoration cases:')
        error('  // allow-hex: <reason>      — hex literals (chart JS configs, decorative bevels)')
        error('')
        for (const line of banned) error('  ' + line)
        error('')
    }

    const templateClasses = checkTemplateClasses()
    if (templateClasses.length > 0) {
        failed = true
        error('')
        error('— Banned Tailwind utility classes in templates —')
        error('')
        error('These Tailwind utilities bypass our token system or use the wrong')
        error('token role. Pick a themed alternative:')
        error('')
        error('  bg-black       → use an inline rgba scrim or a purpose-built token')
        error('                   (rare; genuine "always-black bg" is exotic)')
        error('  text-gray-100  → text-gray-500 / text-gray-600 (themed muted text)')
        error('  text-red-50    → text-red-500 (themed danger text)')
        error('')
        error('Note: bg-white, text-white, text-black are NOT banned — they route')
        error('through tailwind.config.js per-context to themed tokens.')
        error('')
        for (const line of templateClasses) error('  ' + line)
        error('')
    }

    const { missingFromDark, missingFromLight } = checkThemeParity()
    if (missingFromDark.length > 0 || missingFromLight.length > 0) {
        failed = true
        error('')
        error('— Theme-file parity —')
        error('')
        error('ff-theme-light.scss and ff-theme-dark.scss must declare the same')
        error('set of --ff-color-* tokens. A token defined in only one file is')
        error('ambiguous: was it forgotten, or is the cascade intentional? Declare')
        error('it in both files. When the dark value should equal the light one,')
        error('add a `// intentionally identical` comment for clarity.')
        error('')
        if (missingFromDark.length > 0) {
            error(`  Tokens defined in light but NOT in dark (${missingFromDark.length}):`)
            for (const t of missingFromDark) error('    ' + t)
            error('')
        }
        if (missingFromLight.length > 0) {
            error(`  Tokens defined in dark but NOT in light (${missingFromLight.length}):`)
            for (const t of missingFromLight) error('    ' + t)
            error('')
        }
    }

    if (failed) {
        throw new Error('FlowFuse color-token lint failed.')
    }

    log('✓ no banned color references')
    log('✓ no banned template utility classes')
    log('✓ theme-file parity ok')
}

run()
