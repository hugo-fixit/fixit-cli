import { readFileSync, writeFileSync } from 'node:fs'
import toml from 'toml'

interface ParamDoc {
  name: string
  type: string
  defaultValue: string
  description: string
  children: ParamDoc[]
  isTable: boolean
  isArray: boolean
  rawValue: unknown
}

/**
 * Check if a comment line is a separator or section marker (not a real description)
 */
function isSeparatorComment(text: string): boolean {
  return /^[-=+]{3,}$/.test(text.trim())
    || /^[-=]{20,}\s*$/.test(text.trim())
    || /^\+{20,}\s*$/.test(text.trim())
    || /\s+#$/.test(text.trim()) // Group separator like "Global Colors #"
}

/**
 * Check if a comment line is a "hard" separator that should flush pending comments.
 * Hard separators are lines with 20+ `-`, `=`, or `+` characters.
 */
function isHardSeparator(text: string): boolean {
  return /^[-=]{20,}\s*$/.test(text.trim())
    || /^\+{20,}\s*$/.test(text.trim())
}

/**
 * Parse the raw TOML text to extract comments for each key.
 * Returns a map of dotted key paths to their comment lines,
 * and the page-level boundary keys (start/end).
 */
function extractComments(content: string): { commentMap: Map<string, string[]>, pageLevelStartKey: string, pageLevelEndKey: string } {
  const commentMap = new Map<string, string[]>()
  const lines = content.split('\n')
  const pendingComments: string[] = []
  const sectionStack: string[] = []

  let inParams = false
  // How many comments were already stored as section comments (so we skip them for keys)
  let sectionCommentCount = 0
  // Track hard separators to find page-level boundaries
  let afterHardSeparator = false
  let pageLevelStartKey = ''
  let pageLevelEndKey = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect [params] and sub-sections
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      const key = sectionMatch[1]
      if (key === 'params') {
        inParams = true
        sectionStack.length = 0
        sectionStack.push('params')
        pendingComments.length = 0
        sectionCommentCount = 0
        continue
      }
      if (inParams && key.startsWith('params.')) {
        // Track the first sub-section after the second hard separator as page-level end
        if (afterHardSeparator && !pageLevelEndKey && pageLevelStartKey) {
          pageLevelEndKey = key.split('.')[1]
          afterHardSeparator = false
        }
        // Scan backwards from the section header to find the split point.
        // Comments immediately before the header (with no blank line in between)
        // belong to the NEW section. Everything else belongs to the OLD section.
        let splitIdx = pendingComments.length
        let foundSplitPoint = false
        // Scan raw lines backwards from current position
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim()
          if (prevLine === '') {
            // Blank line is the split point — comments before belong to old section
            foundSplitPoint = true
            break
          }
          if (prevLine.startsWith('#')) {
            // Comment line — belongs to the new section's trailing block
            splitIdx--
            continue
          }
          // Non-comment, non-blank line (key-value) — everything before this is old section
          foundSplitPoint = true
          break
        }
        // Flush comments that belong to the OLD section
        if (foundSplitPoint && splitIdx > 0 && sectionStack.length > 1) {
          const sectionKey = sectionStack.slice(1).join('.')
          commentMap.set(sectionKey, pendingComments.slice(0, splitIdx))
        }
        // Keep trailing comments for the new section
        const trailing = pendingComments.slice(splitIdx)
        pendingComments.length = 0
        pendingComments.push(...trailing)
        sectionCommentCount = trailing.length
        // Update section stack
        const parts = key.split('.')
        sectionStack.length = 0
        sectionStack.push(...parts)
        continue
      }
      // Exit params when hitting a non-params top-level section
      if (inParams) {
        const rootKey = key.split('.')[0]
        const nonParamsSections = ['menus', 'markup', 'outputs', 'taxonomies', 'related', 'frontmatter', 'imaging', 'module', 'sitemap', 'minify', 'caches', 'security']
        if (nonParamsSections.includes(rootKey)) {
          inParams = false
          sectionStack.length = 0
          pendingComments.length = 0
          continue
        }
        // Relative sub-section: same logic as above
        let splitIdx = pendingComments.length
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim()
          if (prevLine === '')
            break
          if (prevLine.startsWith('#')) {
            splitIdx--
            continue
          }
          break
        }
        if (splitIdx > 0 && sectionStack.length > 1) {
          const sectionKey = sectionStack.slice(1).join('.')
          commentMap.set(sectionKey, pendingComments.slice(0, splitIdx))
        }
        const trailing = pendingComments.slice(splitIdx)
        pendingComments.length = 0
        pendingComments.push(...trailing)
        sectionStack.length = Math.min(sectionStack.length, 1)
        sectionStack.push(key)
        continue
      }
      continue
    }

    if (!inParams)
      continue

    // Collect comments
    if (trimmed.startsWith('#')) {
      const commentText = trimmed.replace(/^#\s?/, '')
      if (isSeparatorComment(commentText)) {
        // Hard separator (like # +++...): flush pending comments and mark boundary
        if (isHardSeparator(commentText)) {
          pendingComments.length = 0
          afterHardSeparator = true
        }
        // Soft separator (like # Global Colors #): just skip
        continue
      }
      pendingComments.push(commentText)
      continue
    }

    // Skip empty lines
    if (trimmed === '') {
      continue
    }

    // Key-value line
    const kvMatch = trimmed.match(/^(\w+)\s*=/)
    if (kvMatch && sectionStack.length > 0) {
      const keyName = kvMatch[1]
      const fullPath = [...sectionStack.slice(1), keyName].join('.')
      // Track the first key after the hard separator as the page-level start
      if (afterHardSeparator && !pageLevelStartKey && sectionStack.length === 1) {
        pageLevelStartKey = keyName
        afterHardSeparator = false
      }
      // On the first key after a section header, split pending comments:
      // - Comments before the section header line index → section description (already stored)
      // - Comments after the section header → key comments
      // But we need to detect which comments were added AFTER the section header.
      // We do this by checking if there are more pending comments than sectionCommentCount.
      if (sectionStack.length > 1 && pendingComments.length > 0) {
        const sectionKey = sectionStack.slice(1).join('.')
        if (!commentMap.has(sectionKey) && sectionCommentCount > 0) {
          // Store the first N comments as section description
          commentMap.set(sectionKey, pendingComments.slice(0, sectionCommentCount))
          // Remove them from pending, leaving only key comments
          pendingComments.splice(0, sectionCommentCount)
        }
        sectionCommentCount = 0
      }
      if (pendingComments.length > 0) {
        commentMap.set(fullPath, [...pendingComments])
        pendingComments.length = 0
      }
    }

    // Array of tables: [[key]]
    const arrayMatch = trimmed.match(/^\[\[(\w+(?:\.\w+)*)\]\]$/)
    if (arrayMatch && inParams) {
      const keyPath = arrayMatch[1]
      const fullPath = [...sectionStack.slice(1), keyPath].join('.')
      if (pendingComments.length > 0) {
        commentMap.set(fullPath, [...pendingComments])
        pendingComments.length = 0
      }
    }
  }

  return { commentMap, pageLevelStartKey, pageLevelEndKey }
}

/**
 * Detect the Hugo/fixit type of a TOML value
 */
function detectType(value: unknown): string {
  if (value === null || value === undefined)
    return 'string'
  if (typeof value === 'boolean')
    return 'bool'
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'int' : 'float'
  if (typeof value === 'string')
    return 'string'
  if (Array.isArray(value)) {
    if (value.length === 0)
      return 'string array'
    return `${detectType(value[0])} array`
  }
  if (typeof value === 'object')
    return 'map'
  return 'string'
}

/**
 * Format a default value for display in docs
 */
function formatDefault(value: unknown): string {
  if (value === null || value === undefined)
    return ''
  if (typeof value === 'string')
    return value === '' ? '`""`' : `\`${JSON.stringify(value)}\``
  if (typeof value === 'boolean')
    return `\`${value}\``
  if (typeof value === 'number')
    return `\`${value}\``
  if (Array.isArray(value)) {
    if (value.length === 0)
      return '`[]`'
    return `\`${JSON.stringify(value)}\``
  }
  return ''
}

/**
 * Format a default value for TOML block display (no backticks)
 */
function formatTomlValue(value: unknown): string {
  if (value === null || value === undefined)
    return '""'
  if (typeof value === 'string')
    return JSON.stringify(value)
  if (typeof value === 'boolean')
    return String(value)
  if (typeof value === 'number')
    return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0)
      return '[]'
    return JSON.stringify(value)
  }
  return '""'
}

/**
 * Escape special characters for markdown display
 */
function escapeMarkdown(text: string): string {
  return text
}

/**
 * Check if a comment line is a commented-out TOML example (e.g. `key = "value"` or `"key" = "value"`)
 */
function isExampleLine(line: string): boolean {
  // Match quoted key = value or unquoted key = value
  return /^\s*(?:"[^"]*"|'[^']*'|[\w.-]+)\s*=\s*.+/.test(line)
}

/**
 * Join comment lines into a proper description string.
 * Each line is treated as a sentence: capitalize first letter, ensure trailing period.
 * Commented-out TOML lines are treated as examples.
 */
function joinComments(comments: string[]): string {
  if (comments.length === 0)
    return ''
  // Filter out empty comments
  const filtered = comments.filter(c => c.trim() !== '')
  if (filtered.length === 0)
    return ''
  // Treat each line as a sentence or example
  const sentences = filtered.map((line) => {
    const trimmed = line.trim()
    // If it looks like a commented-out TOML key-value, treat as example
    if (isExampleLine(trimmed)) {
      return `Example: \`${trimmed}\`.`
    }
    let s = escapeMarkdown(trimmed)
    // Don't capitalize URLs (http:// or https://)
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
      s = s.charAt(0).toUpperCase() + s.slice(1)
    }
    if (!s.endsWith('.') && !s.endsWith('!') && !s.endsWith('?'))
      s += '.'
    return s
  })
  return sentences.join(' ')
}

/**
 * Recursively document a TOML section
 */
function documentSection(
  obj: Record<string, unknown>,
  commentMap: Map<string, string[]>,
  parentPath: string,
): ParamDoc[] {
  const docs: ParamDoc[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key
    const comments = commentMap.get(fullPath) || []
    const type = detectType(value)
    const isTable = typeof value === 'object' && !Array.isArray(value) && value !== null
    const isArray = Array.isArray(value)

    const doc: ParamDoc = {
      name: key,
      type,
      defaultValue: formatDefault(value),
      description: joinComments(comments),
      children: [],
      isTable,
      isArray,
      rawValue: value,
    }

    if (isTable && !isArray) {
      doc.children = documentSection(
        value as Record<string, unknown>,
        commentMap,
        fullPath,
      )
    }

    docs.push(doc)
  }

  return docs
}

/**
 * Get the raw TOML value string from a ParamDoc's default value
 */
function rawDefault(doc: ParamDoc): string {
  // defaultValue has backticks around it, strip them
  const val = doc.defaultValue.replace(/`/g, '')
  return val || '""'
}

/**
 * Render a TOML block for a param section (no indentation in TOML syntax)
 */
function renderTomlBlock(doc: ParamDoc, lines: string[], sectionPath: string): void {
  lines.push(`[params.${sectionPath}]`)

  for (const child of doc.children) {
    if (child.isTable) {
      lines.push('')
      lines.push(`[params.${sectionPath}.${child.name}]`)
      for (const grandchild of child.children) {
        if (grandchild.isTable) {
          lines.push('')
          lines.push(`[params.${sectionPath}.${child.name}.${grandchild.name}]`)
          for (const gg of grandchild.children) {
            lines.push(`${gg.name} = ${rawDefault(gg)}`)
          }
        }
        else {
          lines.push(`${grandchild.name} = ${rawDefault(grandchild)}`)
        }
      }
    }
    else if (child.isArray && Array.isArray(child.rawValue) && child.rawValue.length > 0 && typeof child.rawValue[0] === 'object') {
      // Array of tables: [[section.name]]
      for (const item of child.rawValue) {
        lines.push('')
        lines.push(`[[params.${sectionPath}.${child.name}]]`)
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          lines.push(`${k} = ${formatTomlValue(v)}`)
        }
      }
    }
    else {
      lines.push(`${child.name} = ${rawDefault(child)}`)
    }
  }
}

/**
 * Render children as definition list items
 */
function renderChildren(children: ParamDoc[], lines: string[]): void {
  for (const child of children) {
    let meta = `\`${child.type}\``
    const desc = child.description.replace(/\.$/, '')
    if (child.defaultValue && child.type !== 'map') {
      meta += desc ? ` ${desc}. Default is ${child.defaultValue}.` : ` Default is ${child.defaultValue}.`
    }
    else if (desc) {
      meta += ` ${desc}.`
    }

    lines.push(child.name)
    lines.push(`: ${meta}`)
    lines.push('')

    // If this child has its own children, render them too
    if (child.children.length > 0) {
      for (const grandchild of child.children) {
        let gcMeta = `\`${grandchild.type}\``
        const gcDesc = grandchild.description.replace(/\.$/, '')
        if (grandchild.defaultValue && grandchild.type !== 'map') {
          gcMeta += gcDesc ? ` ${gcDesc}. Default is ${grandchild.defaultValue}.` : ` Default is ${grandchild.defaultValue}.`
        }
        else if (gcDesc) {
          gcMeta += ` ${gcDesc}.`
        }
        lines.push(`- ${grandchild.name}: ${gcMeta}`)
      }
      lines.push('')
    }
  }
}

/**
 * Render a ParamDoc as markdown
 */
function renderParam(doc: ParamDoc): string {
  const lines: string[] = []

  // Type, description, then default info
  let meta = `\`${doc.type}\``
  const desc = doc.description.replace(/\.$/, '')
  if (doc.defaultValue && doc.type !== 'map') {
    meta += desc ? ` ${desc}. Default is ${doc.defaultValue}.` : ` Default is ${doc.defaultValue}.`
  }
  else if (desc) {
    meta += ` ${desc}.`
  }

  // Top-level param: ### heading
  lines.push(`### ${doc.name}`)
  lines.push('')
  lines.push(meta)

  // Children
  if (doc.children.length > 0) {
    lines.push('')

    // Check if the TOML block has any meaningful content (key-value pairs at any depth)
    const hasContent = (children: ParamDoc[]): boolean =>
      children.some(child => !child.isTable || (child.children.length > 0 && hasContent(child.children)))
    const codeBlock = hasContent(doc.children) ? '```toggle' : '```toml'

    // Render TOML block
    lines.push(codeBlock)
    lines.push('[params]')
    lines.push('')
    renderTomlBlock(doc, lines, doc.name)
    lines.push('```')
    lines.push('')

    // Render children as definition list
    renderChildren(doc.children, lines)
  }

  // Trim trailing blank lines, then join with single newline
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  return lines.map(line => line.trimEnd()).join('\n')
}

/**
 * Generate complete theme configuration documentation from TOML content
 * @param content TOML content string
 * @returns Markdown documentation string
 */
export function generateDocs(content: string): string {
  const parsed = toml.parse(content)

  if (!parsed.params) {
    throw new Error('No [params] section found in the TOML file.')
  }

  const { commentMap, pageLevelStartKey, pageLevelEndKey } = extractComments(content)
  const params = parsed.params as Record<string, unknown>
  const docs = documentSection(params, commentMap, '')

  // Split docs into site-level and page-level groups
  const siteLevel: ParamDoc[] = []
  const pageLevel: ParamDoc[] = []
  let isPageLevel = false

  for (const doc of docs) {
    if (pageLevelStartKey && doc.name === pageLevelStartKey) {
      isPageLevel = true
    }
    if (pageLevelEndKey && doc.name === pageLevelEndKey) {
      isPageLevel = false
    }
    if (isPageLevel) {
      pageLevel.push(doc)
    }
    else {
      siteLevel.push(doc)
    }
  }

  const output: string[] = []

  if (siteLevel.length > 0) {
    output.push('## Site Level')
    output.push('These apply to the entire site and cannot be overridden on a per-page basis.')
    for (const doc of siteLevel) {
      output.push(renderParam(doc))
    }
  }

  if (pageLevel.length > 0) {
    output.push('## Page Level')
    output.push('These can be overridden on a per-page basis via front matter.')
    for (const doc of pageLevel) {
      output.push(renderParam(doc))
    }
  }

  // Clean up trailing whitespace on each line
  return output.join('\n\n').split('\n').map(line => line.trimEnd()).join('\n')
}

/**
 * Apply generated docs into a template file between markers.
 * Replaces content between `<!-- HUGO_FIXIT_PARAMS:START -->` and `<!-- HUGO_FIXIT_PARAMS:END -->`.
 * @param tomlContent TOML content string
 * @param templatePath Path to the template file
 * @param outputPath Optional output path (defaults to overwriting the template file)
 * @param command The CLI command that was used to generate the docs (displayed in auto-generated comment)
 */
export function applyTemplate(tomlContent: string, templatePath: string, outputPath?: string, command?: string): void {
  const template = readFileSync(templatePath, 'utf-8')
  const docs = generateDocs(tomlContent)

  const startMarker = '<!-- HUGO_FIXIT_PARAMS:START -->'
  const endMarker = '<!-- HUGO_FIXIT_PARAMS:END -->'

  const startIdx = template.indexOf(startMarker)
  const endIdx = template.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Markers not found in template file. Expected both "${startMarker}" and "${endMarker}".`)
  }

  if (startIdx > endIdx) {
    throw new Error('START marker appears after END marker in template file.')
  }

  const before = template.slice(0, startIdx + startMarker.length)
  const after = template.slice(endIdx)
  // Prepend auto-generated comment if command is provided
  const comment = command
    ? `<!--\nAutomatically generated by the \`${command}\` command.\nDo not modify it manually!\n-->\n\n`
    : ''
  const result = `${before}\n${comment}${docs}\n${after}`

  const dest = outputPath || templatePath
  writeFileSync(dest, result)
}
