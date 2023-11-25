import https from 'https'
import { readFileSync } from 'fs';

/**
 * import json file
 * @param {String} relativePath relative path to json file
 * @returns 
 */
function importJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url).pathname, 'utf8'))
}

/**
 * get latest release info from GitHub API
 * @param {String} repoOwner repo owner
 * @param {String} repoName repo name
 * @example getLatestRelease('hugo-fixit', 'FixIt')
 * @returns 
 */
function getLatestRelease(repoOwner, repoName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repoOwner}/${repoName}/releases/latest`,
      headers: { 'User-Agent': 'mozilla/5.0' },
    }
    // set Authorization header set to avoid GitHub API rate limit
    if (process.env.GITHUB_TOKEN) {
      options.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
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
        } else {
          reject(`Failed to get latest release (${res.statusCode})`)
        }
      })
    })

    req.on('error', (err) => {
      reject(err.message)
    })

    req.end()
  })
}

export {
  importJson,
  getLatestRelease,
}
