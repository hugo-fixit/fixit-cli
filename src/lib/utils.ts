import { readFileSync } from 'node:fs'
import https from 'node:https'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

interface ReleaseInfo {
  version: string
  changelog: string
  homeUrl: string
}

/**
 * import json file
 * @param {string} relativePath relative path to json file
 * @returns {any} json object
 */
function importJson(relativePath: string): any {
  const moduleURL = new URL(import.meta.url)
  const modulePath = fileURLToPath(moduleURL)
  const basePath = dirname(modulePath)
  const filePath = join(basePath, relativePath)
  const fileContent = readFileSync(filePath, 'utf8')
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

export {
  getLatestRelease,
  importJson,
}
