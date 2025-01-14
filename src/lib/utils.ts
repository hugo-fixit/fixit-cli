import fs, { readFileSync } from 'node:fs'
import https from 'node:https'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import shell from 'shelljs'

interface ReleaseInfo {
  version: string
  changelog: string
  homeUrl: string
}

interface Timer {
  __start: number
  __end: number
  start: (msg?: string) => void
  stop: () => number
}

/**
 * import json file
 * @param {string} relativePath relative path to json file
 * @returns {any} json object
 */
function importJson(relativePath: string): any {
  const rootPath = dirname(fileURLToPath(new URL(import.meta.url))).replace(/\/dist\/lib$/, '')
  const fileContent = readFileSync(join(rootPath, relativePath), 'utf8')
  return JSON.parse(fileContent)
}

/**
 * get latest release info from GitHub API
 * @param {string} repoOwner repo owner
 * @param {string} repoName repo name
 * @example getLatestRelease('hugo-fixit', 'FixIt')
 * @returns {Promise<ReleaseInfo>} release info
 */
function getLatestRelease(repoOwner: string, repoName: string): Promise<ReleaseInfo> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.github.com',
      path: `/repos/${repoOwner}/${repoName}/releases/latest`,
      headers: {
        'User-Agent': 'mozilla/5.0',
        // set Authorization header set to avoid GitHub API rate limit
        ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
      },
    }

    const req = https.get(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          const releaseInfo = JSON.parse(data)
          const version = releaseInfo.tag_name
          const changelog = releaseInfo.body
          const homeUrl = releaseInfo.html_url
          resolve({ version, changelog, homeUrl })
        }
        else {
          reject(new Error(`Failed to get latest release (${res.statusCode})`))
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.end()
  })
}

/**
 * handle target directory
 * @param {string} targetDir target directory
 * @returns {Promise<string>} target directory
 */
async function handleTargetDir(targetDir: string): Promise<string> {
  if (fs.existsSync(targetDir)) {
    const action = await p.select({
      message: `Target Directory ${targetDir} is not empty. Please choose how to proceed:`,
      options: [
        { value: 'cancel', label: 'Cancel operation' },
        { value: 'rename', label: 'Rename target directory' },
        { value: 'remove', label: 'Remove existing files and continue' },
      ],
    })
    if (action === 'cancel' || p.isCancel(action)) {
      p.cancel('Operation cancelled.')
      process.exit(0)
    }
    if (action === 'rename') {
      targetDir = `${targetDir}-${Date.now().toString(36)}`
    }
    else if (action === 'remove') {
      shell.rm('-rf', targetDir)
    }
  }
  return Promise.resolve(targetDir)
}

const timer: Timer = {
  __start: 0,
  __end: 0,
  start: (msg): void => {
    timer.__start = Date.now()
    msg && p.intro(msg)
  },
  stop: (): number => {
    timer.__end = Date.now()
    return timer.__end - timer.__start
  },
}

export {
  getLatestRelease,
  handleTargetDir,
  importJson,
  ReleaseInfo,
  timer,
  Timer,
}
