import type {
  SimpleGit,
} from 'simple-git'
import fs, { readFileSync } from 'node:fs'
import https from 'node:https'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import c from 'picocolors'
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

interface Spinner {
  start: (msg?: string) => void
  stop: (msg?: string, code?: number) => void
  message: (msg?: string) => void
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

/**
 * Modify a file's content using a provided modification function
 * @param {string} filePath Path to the file to be modified
 * @param {(data: string) => string} modifyFn Function to modify the file content
 * @param {Spinner} spinner Spinner instance to show progress
 * @param {string} message Message to display during the modification
 */
async function modifyFile(filePath: string, modifyFn: (data: string) => string, spinner: Spinner, message: string) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      spinner.stop(err.message, -1)
      return
    }
    spinner.message(message)
    const result = modifyFn(data)
    fs.writeFile(filePath, result, 'utf8', (err) => {
      if (err) {
        spinner.stop(err.message, -1)
        return
      }
      spinner.message(`${c.green('✔')} ${message}`)
    })
  })
}

/**
 * Remove the remote origin from a git repository
 * @param {SimpleGit} git SimpleGit instance
 * @param {Spinner} spinner Spinner instance to show progress
 */
async function removeRemoteOrigin(git: SimpleGit, spinner: Spinner) {
  spinner.message('Removing remote origin.')
  git.removeRemote('origin', (err) => {
    if (err) {
      spinner.stop(err.message, -1)
      return
    }
    spinner.message(`${c.green('✔')} removed remote origin.`)
  })
}

/**
 * Timer object to measure elapsed time
 * @type {Timer}
 */
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
  modifyFile,
  ReleaseInfo,
  removeRemoteOrigin,
  timer,
  Timer,
}
