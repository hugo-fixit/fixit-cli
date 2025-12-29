export type SplitFiles = Map<string, string>

export class ConfigSplitter {
  split(content: string): SplitFiles {
    const lines = content.split('\n')
    const files = new Map<string, string[]>()

    let currentFileName = 'hugo.toml'
    let pendingComments: string[] = []

    files.set(currentFileName, [])

    let startIndex = 0

    // Skip header block (# ===...  ===...)
    const separatorPattern = /^#\s*=+/

    if (lines.length > 0 && separatorPattern.test(lines[0].trim())) {
      for (let j = 1; j < lines.length; j++) {
        if (separatorPattern.test(lines[j].trim())) {
          startIndex = j + 1
          if (startIndex < lines.length && lines[startIndex].trim() === '') {
            startIndex++
          }
          break
        }
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      if (trimmedLine.startsWith('#') || trimmedLine === '') {
        pendingComments.push(line)
        continue
      }

      // Check for section header: [key], [[key]], [key.subkey], [[key.subkey]]
      const headerMatch = line.match(/^(\s*(?:\[\[|\[))([^\]]+)(\].*)$/)

      if (headerMatch) {
        // Split pending comments by separator line (# ---...)
        let splitIndex = -1
        const separatorRegex = /^#\s*-{20,}/

        for (let j = 0; j < pendingComments.length; j++) {
          if (separatorRegex.test(pendingComments[j])) {
            splitIndex = j - 1
            break
          }
        }

        // Fallback: split by blank line
        if (splitIndex === -1) {
          for (let j = pendingComments.length - 1; j >= 0; j--) {
            if (pendingComments[j].trim() === '') {
              splitIndex = j
              break
            }
          }
        }

        if (splitIndex !== -1) {
          const commentsToKeep = pendingComments.slice(0, splitIndex + 1)
          const commentsToMove = pendingComments.slice(splitIndex + 1)

          const currentBuffer = files.get(currentFileName)!
          currentBuffer.push(...commentsToKeep)

          pendingComments = commentsToMove
        }

        const prefix = headerMatch[1]
        const fullKey = headerMatch[2].trim()
        const suffix = headerMatch[3]

        const { root, remainder } = this.parseKey(fullKey)

        // Unquote root for filename if needed
        const cleanRoot = root.replace(/^(['"])(.*)\1$/, '$2')
        const newFileName = `${cleanRoot}.toml`

        // Determine if we should switch files
        if (prefix.trim() === '[[' && !remainder) {
          // Top level array, keep in hugo.toml
          currentFileName = 'hugo.toml'
          const currentBuffer = files.get(currentFileName)!
          currentBuffer.push(...pendingComments)
          pendingComments = []
          currentBuffer.push(line)
          continue
        }

        // Switch file context
        currentFileName = newFileName
        if (!files.has(currentFileName)) {
          files.set(currentFileName, [])
        }

        const currentBuffer = files.get(currentFileName)!

        // Remove leading empty lines for new files
        if (currentBuffer.length === 0) {
          while (pendingComments.length > 0 && pendingComments[0].trim() === '') {
            pendingComments.shift()
          }
        }

        // Remove trailing empty lines
        while (pendingComments.length > 0 && pendingComments[pendingComments.length - 1].trim() === '') {
          pendingComments.pop()
        }

        // Add single empty line for new file headers
        if (currentBuffer.length === 0) {
          pendingComments.push('')
        }

        currentBuffer.push(...pendingComments)
        pendingComments = []

        // Determine new line content
        let newLine: string | null = null
        if (remainder) {
          newLine = `${prefix}${remainder}${suffix}`
        }
        else {
          // [root] -> table.
          // If we are moving to root.toml, we don't need [root] header at the top.
          newLine = null
        }

        if (newLine !== null) {
          currentBuffer.push(newLine)
        }
      }
      else {
        // Regular line (key-value)
        const currentBuffer = files.get(currentFileName)!
        currentBuffer.push(...pendingComments)
        pendingComments = []
        currentBuffer.push(line)
      }
    }

    // Flush remaining comments (footer)
    if (pendingComments.length > 0) {
      const currentBuffer = files.get(currentFileName)!
      currentBuffer.push(...pendingComments)
    }

    const result = new Map<string, string>()
    for (const [file, lines] of files) {
      // Normalize consecutive empty lines to single empty line
      const normalizedLines: string[] = []
      let previousLineWasEmpty = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isEmpty = line.trim() === ''

        if (isEmpty) {
          if (!previousLineWasEmpty) {
            normalizedLines.push('')
            previousLineWasEmpty = true
          }
        }
        else {
          normalizedLines.push(line)
          previousLineWasEmpty = false
        }
      }

      // Remove trailing empty lines
      while (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] === '') {
        normalizedLines.pop()
      }
      if (normalizedLines.length > 0) {
        result.set(file, `${normalizedLines.join('\n')}\n`)
      }
    }

    return result
  }

  parseKey(fullKey: string): { root: string, remainder: string | null } {
    const parts: string[] = []
    let currentPart = ''
    let inQuote: '"' | '\'' | null = null
    let escape = false

    for (let i = 0; i < fullKey.length; i++) {
      const char = fullKey[i]

      if (escape) {
        currentPart += char
        escape = false
        continue
      }

      if (char === '\\' && inQuote) {
        escape = true
        currentPart += char
        continue
      }

      if ((char === '"' || char === '\'') && !inQuote) {
        inQuote = char
        currentPart += char
      }
      else if (char === inQuote) {
        inQuote = null
        currentPart += char
      }
      else if (char === '.' && !inQuote) {
        parts.push(currentPart.trim())
        currentPart = ''
      }
      else {
        currentPart += char
      }
    }
    if (currentPart) {
      parts.push(currentPart.trim())
    }

    if (parts.length === 0) {
      return { root: fullKey, remainder: null }
    }

    if (parts.length === 1) {
      return { root: parts[0], remainder: null }
    }

    const remainder = parts.slice(1).join('.')
    return { root: parts[0], remainder }
  }
}
