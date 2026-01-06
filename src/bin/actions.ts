import type {
  CloneOptions,
  SimpleGit,
  SimpleGitProgressEvent,
} from 'simple-git'
import type { SplitFiles } from '../lib/splitter.js'
import type { ReleaseInfo } from '../lib/utils.js'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import yaml from 'js-yaml'
import c from 'picocolors'
import shell from 'shelljs'
import {
  CleanOptions,
  simpleGit,
} from 'simple-git'
import toml from 'toml'
import { ConfigSplitter } from '../lib/splitter.js'
import {
  getLatestRelease,
  handleTargetDir,
  modifyFile,
  removeRemoteOrigin,
  timer,
} from '../lib/utils.js'

type Template = 'go' | 'git'

/**
 * action for create command
 * @param {string} projectName project name
 * @example fixit create [project-name]
 */
async function createAction(projectName: string) {
  timer.start('Creating a new FixIt project step by step!')
  const repositories: Record<Template, string> = {
    go: 'https://github.com/hugo-fixit/hugo-fixit-starter.git',
    git: 'https://github.com/hugo-fixit/hugo-fixit-starter1.git',
  }
  const answers = await p.group(
    {
      name: () => p.text({
        message: 'Please input project name:',
        placeholder: 'FixIt project name, e.g. `my-blog`',
        initialValue: projectName || '',
        validate: (val: string) => {
          if (val === '') {
            return 'FixIt project name is required!'
          }
        },
      }),
      template: () => p.select({
        message: 'Please choose a template:',
        options: [
          { value: 'go', label: 'Hugo module based' },
          { value: 'git', label: 'Git submodule based' },
        ],
      }),
      blogTitle: () => p.text({
        message: 'Please input your blog title:',
        placeholder: '[blog title]',
      }),
      authorName: () => p.text({
        message: 'Please input your name:',
        placeholder: '[author name]',
      }),
      authorEmail: () => p.text({
        message: 'Please input your email:',
        placeholder: '[author email]',
      }),
      authorLink: () => p.text({
        message: 'Please input your link:',
        placeholder: '[author link]',
      }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )
  let hugoModulePath = ''
  if (answers.template === 'go') {
    hugoModulePath = await p.text({
      message: 'Please input module path:',
      placeholder: 'e.g. github.com/your_name/your_project',
      initialValue: `github.com/${answers.authorName || 'your_name'}/${answers.name}`,
      validate: (val: string) => {
        if (val === '') {
          return 'module path is required!'
        }
      },
    }) as string
  }
  const targetDir = await handleTargetDir(answers.name)
  p.log.step(`Initializing FixIt project ${targetDir}, please wait a moment...`)
  // 1. download template
  const spinnerClone = p.spinner()
  spinnerClone.start(`Template downloading from ${c.cyan(repositories[answers.template as Template])}.`)
  const progress = ({ method, stage, progress }: SimpleGitProgressEvent) => {
    spinnerClone.message(c.yellow(`git.${method} ${stage} stage ${progress}% complete${'.'.repeat(Math.floor(Math.random() * 3) + 1)}`))
  }
  const git: SimpleGit = simpleGit({ progress })
  git.clean(CleanOptions.FORCE)
  const cloneOptions: CloneOptions = {
    '--depth': 1,
    '--branch': 'main',
    '--single-branch': null,
  }
  if (answers.template === 'git') {
    cloneOptions['--recurse-submodules'] = undefined
    cloneOptions['--shallow-submodules'] = undefined
  }
  git.clone(repositories[answers.template as Template], targetDir, cloneOptions, (err) => {
    if (err) {
      spinnerClone.stop(err.message, -1)
      return
    }
    spinnerClone.stop(`${c.green('✔')} Template downloaded from ${c.cyan(repositories[answers.template as Template])}`, 0)
    const siteTime = new Date().toISOString()

    // 2. initialize FixIt project
    const spinnerInit = p.spinner()
    spinnerInit.start(`Initializing FixIt project ${targetDir}.`)
    // remove remote origin
    git.cwd(targetDir)
    removeRemoteOrigin(git, spinnerInit)
    // initialize Hugo module
    if (answers.template === 'go') {
      spinnerInit.message('Initializing Hugo module.')
      const goMod = join(process.cwd(), targetDir, 'go.mod')
      modifyFile(goMod, data => data.replace(/module .*/, `module ${hugoModulePath}`), spinnerInit, 'Modifying module path in go.mod.')
    }
    // initialize hugo config
    const hugoToml = join(process.cwd(), targetDir, 'config/_default/hugo.toml')
    modifyFile(hugoToml, (data) => {
      let result = data.replace(/baseURL = ".*"/, 'baseURL = "https://example.org/"')
      if (answers.blogTitle) {
        result = result.replace(/title = ".*"/, `title = "${answers.blogTitle}"`)
      }
      return result
    }, spinnerInit, 'Modifying baseURL and title in hugo.toml.')
    // initialize Fixit params.toml
    const paramsToml = join(process.cwd(), targetDir, 'config/_default/params.toml')
    modifyFile(paramsToml, (data) => {
      let result = data.replace(
        /value = "" # e.g. "2021-12-18T16:15:22\+08:00"/,
        `value = "${siteTime}" # e.g. "2021-12-18T16:15:22+08:00"`,
      )
      result = result.replace(/since = \d+/, `since = ${new Date().getFullYear()}`)
      if (answers.authorName || answers.authorEmail || answers.authorLink) {
        result = result.replace(
          /\[author\]\n.*\n.*\n.*\n/,
          `[author]\n  name = "${answers.authorName || ''}"\n  email = "${answers.authorEmail || ''}"\n  link = "${answers.authorLink || ''}"\n`,
        )
      }
      result = result.replace(/logo = ".*"/, 'logo = "/images/fixit.min.svg"')
      return result
    }, spinnerInit, 'Modifying site time and author info etc. in params.toml.')
    // initialize hello world post create time
    const helloMd = join(process.cwd(), targetDir, 'content/posts/hello-world.md')
    modifyFile(helloMd, data => data.replace(
      /date: .*/,
      `date: ${siteTime}`,
    ), spinnerInit, 'Modifying create time in hello-world.md.')
    // remove history commits
    spinnerInit.message('Removing history commits.')
    git.raw(['update-ref', '-d', 'HEAD'], (err) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message(`${c.green('✔')} removed history commits.`)
    }).then(async () => {
      // commit first commit
      await git.add('./*')
      await git.commit('first commit')
      spinnerInit.stop(`${c.green('✔')} FixIt project ${targetDir} initialized!`, 0)
      p.log.success('🎉 Congratulations! You have created a new FixIt project.')
      const run = await p.confirm({
        message: '🚀 Do you want to start the development server now?',
      })
      if (!run) {
        p.log.info(`Run ${c.blue(`cd ${targetDir} && hugo server -O`)} to start the development server.`)
        p.outro(`Done in ${timer.stop() / 1000}s`)
        process.exit(0)
      }
      // 3. start development server
      p.log.step('Starting the development server...')
      if (!shell.which('hugo')) {
        p.log.error(`${c.red('Hugo is not installed. You need to install Hugo to start this project!')}`)
        p.log.info(`After installing Hugo, run ${c.blue(`cd ${targetDir} && hugo server -O`)} to start the development server.`)
        p.outro(`Done in ${timer.stop() / 1000}s`)
        // TODO install hugo-bin or hugo-extended automatically
        process.exit(1)
      }
      p.log.info(`> ${c.blue(`cd ${targetDir} && hugo server -O`)}`)
      p.outro(`Done in ${timer.stop() / 1000}s`)
      shell.cd(targetDir)
      shell.exec('hugo server -O')
    })
  })
}

/**
 * action for create component subcommand
 * clone https://github.com/hugo-fixit/component-skeleton
 * @param {string} componentName component name
 * @example fixit create component [component-name]
 */
async function createComponentAction(componentName: string) {
  timer.start('Creating a new FixIt component step by step!')
  const repository = 'https://github.com/hugo-fixit/component-skeleton'
  const answers = await p.group(
    {
      name: () => p.text({
        message: 'Please input component name:',
        placeholder: 'Component name, e.g. `my-component`',
        initialValue: componentName || '',
        validate: (val: string) => {
          if (val === '') {
            return 'Component name is required!'
          }
        },
      }),
      author: () => p.text({
        message: 'Please input your GitHub username:',
        placeholder: 'GitHub username, e.g. `Lruihao`',
        initialValue: 'hugo-fixit',
        validate: (val: string) => {
          if (val === '') {
            return 'GitHub username is required!'
          }
        },
      }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )
  const targetDir = await handleTargetDir(answers.name)
  p.log.step(`Initializing FixIt component ${targetDir}, please wait a moment...`)
  // 1. download skeleton
  const spinnerClone = p.spinner()
  spinnerClone.start(`Skeleton downloading from ${c.cyan(repository)}.`)
  const progress = ({ method, stage, progress }: SimpleGitProgressEvent) => {
    spinnerClone.message(c.yellow(`git.${method} ${stage} stage ${progress}% complete${'.'.repeat(Math.floor(Math.random() * 3) + 1)}`))
  }
  const git: SimpleGit = simpleGit({ progress })
  git.clean(CleanOptions.FORCE)
  git.clone(repository, targetDir, { '--depth': 1, '--branch': 'main', '--single-branch': null }, (err) => {
    if (err) {
      spinnerClone.stop(err.message, -1)
      return
    }
    spinnerClone.stop(`${c.green('✔')} Skeleton downloaded from ${c.cyan(repository)}`, 0)
    // 2. initialize FixIt component
    const spinnerInit = p.spinner()
    spinnerInit.start(`Initializing FixIt component ${targetDir}.`)
    // remove remote origin
    git.cwd(targetDir)
    removeRemoteOrigin(git, spinnerInit)
    // initialize Hugo module
    spinnerInit.message('Initializing Hugo module.')
    const goMod = join(process.cwd(), targetDir, 'go.mod')
    modifyFile(goMod, data => data.replace(/module .*/, `module github.com/${answers.author}/${answers.name}`), spinnerInit, 'Modifying module path in go.mod.')
    // modify LICENSE
    const license = join(process.cwd(), targetDir, 'LICENSE')
    modifyFile(license, (data) => {
      const currentYear = new Date().getFullYear()
      return data.replace(/Copyright \(c\) \d+ .*/, `Copyright (c) ${currentYear} ${answers.author} (https://github.com/${answers.author})`)
    }, spinnerInit, 'Modifying author in LICENSE.')
    // modify README.md and README.en.md
    for (const readmeFile of ['README.md', 'README.en.md']) {
      const readme = join(process.cwd(), targetDir, readmeFile)
      modifyFile(readme, data => data.replace(/hugo-fixit\/\{component-xxx\}/g, `${answers.author}/${answers.name}`).replace(/\{component-xxx\}/g, answers.name), spinnerInit, `Modifying author in ${readmeFile}.`)
    }
    // 3. commit first commit and remove history commits
    spinnerInit.message('Removing history commits.')
    git.raw(['update-ref', '-d', 'HEAD'], (err) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message(`${c.green('✔')} removed history commits.`)
    }).then(async () => {
      await git.add('./*')
      await git.commit('first commit')
      spinnerInit.stop(`${c.green('✔')} FixIt component ${targetDir} initialized!`, 0)
      p.log.success('🎉 Congratulations! You have created a new FixIt component.')
      p.outro(`Done in ${timer.stop() / 1000}s`)
    })
  })
}

async function splitAction(file: string, options: { output: string }) {
  timer.start('Splitting configuration file')

  const outputDir = resolve(process.cwd(), options.output)
  let content: string

  // Check if file is a URL
  const isUrl = /^https?:\/\//i.test(file)

  if (isUrl) {
    p.log.step(`Downloading from: ${c.cyan(file)}`)
    const spinner = p.spinner()
    spinner.start('Downloading remote file.')

    try {
      const response = await fetch(file)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      content = await response.text()
      spinner.stop(`${c.green('✔')} Remote file downloaded successfully!`, 0)
    }
    catch (error) {
      spinner.stop(`${c.red('✘')} Failed to download remote file.`, -1)
      p.log.error(c.red((error as Error).message))
      process.exit(1)
    }
  }
  else {
    const inputPath = resolve(process.cwd(), file)
    p.log.step(`Reading from: ${c.cyan(inputPath)}`)

    if (!existsSync(inputPath)) {
      p.log.error(`${c.red('File not found:')} ${inputPath}`)
      process.exit(1)
    }

    content = readFileSync(inputPath, 'utf-8')
  }

  const spinner = p.spinner()
  spinner.start('Splitting configuration file.')

  try {
    const splitter = new ConfigSplitter()
    const result: SplitFiles = splitter.split(content)

    // Create output directory
    if (!existsSync(outputDir)) {
      spinner.message(`Creating directory: ${c.cyan(outputDir)}`)
      mkdirSync(outputDir, { recursive: true })
    }

    // Write files
    for (const [fileName, fileContent] of result) {
      const filePath = join(outputDir, fileName)
      writeFileSync(filePath, fileContent)
      spinner.message(`${c.green('✔')} Created ${c.cyan(filePath)}`)
    }

    spinner.stop(`${c.green('✔')} Configuration file split successfully!`, 0)
    p.log.success(`🎉 Created ${result.size} file(s) in ${c.cyan(outputDir)}`)
    p.outro(`Done in ${timer.stop() / 1000}s`)
  }
  catch (error) {
    spinner.stop(`${c.red('✘')} Failed to split configuration file.`, -1)
    p.log.error(c.red((error as Error).message))
    process.exit(1)
  }
}

async function tomlToYamlAction(file: string, options: { replace?: boolean }) {
  const replace = options.replace ?? false

  const inputPath = resolve(process.cwd(), file)
  p.log.step(`Reading from: ${c.cyan(inputPath)}`)

  if (!existsSync(inputPath)) {
    p.log.error(`${c.red('File not found:')} ${inputPath}`)
    process.exit(1)
  }

  const isDirectory = statSync(inputPath).isDirectory()
  const tomlFiles: string[] = []

  if (isDirectory) {
    const files = readdirSync(inputPath)
    for (const f of files) {
      if (f.endsWith('.toml')) {
        tomlFiles.push(resolve(inputPath, f))
      }
    }
    if (tomlFiles.length === 0) {
      p.log.error(`${c.red('No TOML files found in:')} ${inputPath}`)
      process.exit(1)
    }
  }
  else {
    tomlFiles.push(inputPath)
  }

  const spinner = p.spinner()
  spinner.start(`Converting TOML to YAML.`)

  let successCount = 0
  let failCount = 0

  try {
    for (const tomlFile of tomlFiles) {
      try {
        const tomlContent = readFileSync(tomlFile, 'utf-8')

        const headerComments: string[] = []
        const lines = tomlContent.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed === '') {
            break
          }
          if (trimmed.startsWith('#')) {
            headerComments.push(line)
          }
        }

        const parsedToml = toml.parse(tomlContent)
        let yamlContent = yaml.dump(parsedToml)

        if (headerComments.length > 0) {
          yamlContent = `${headerComments.join('\n')}\n\n${yamlContent}`
        }

        const outputPath = tomlFile.replace(/\.toml$/, '.yaml')
        writeFileSync(outputPath, yamlContent)

        if (replace) {
          unlinkSync(tomlFile)
        }

        successCount++
      }
      catch (fileError) {
        p.log.error(`${c.red('Failed to convert:')} ${tomlFile}`)
        p.log.error(c.red((fileError as Error).message))
        failCount++
      }
    }

    spinner.stop(`${c.green('✔')} Converted ${successCount}/${tomlFiles.length} file(s) successfully!`, 0)
    if (failCount > 0) {
      p.log.warn(`${c.yellow(`${failCount} file(s) failed`)}`)
    }
    if (replace) {
      p.log.info(`${c.cyan(`${successCount} TOML file(s) replaced`)}`)
    }
    p.outro(`Done in ${timer.stop() / 1000}s`)
  }
  catch (error) {
    spinner.stop(`${c.red('✘')} Failed to convert TOML to YAML.`, -1)
    p.log.error(c.red((error as Error).message))
    process.exit(1)
  }
}

/**
 * action for check command
 * @example fixit check
 * @example GITHUB_TOKEN=ghp_ifbeKixxxxxxxxxxxxxxxxxxxxxxxx0gVAgF fixit check
 */
function checkAction() {
  timer.start('Checking for updates')
  const spinner = p.spinner()
  spinner.start('Checking the latest version of FixIt theme.')
  getLatestRelease('hugo-fixit', 'FixIt')
    .then(({ version, changelog, homeUrl }: ReleaseInfo) => {
      p.log.info(`Release Notes: ${c.cyan(homeUrl)}\n\n${changelog.split('\n').map(line => c.gray(line)).join('\n')}`)
      spinner.stop(`${c.green('✔')} The latest version of FixIt theme is ${c.blue(version)}.`, 0)
      p.log.step(
        `You can use commands below to update FixIt theme to the latest version.\n`
        + `${c.gray('Hugo module:')}\n`
        + `  ${c.blue(`hugo mod get -u github.com/hugo-fixit/FixIt@${version}`)}\n`
        + `  ${c.blue('hugo mod tidy')}\n`
        + `${c.gray('Git submodule:')}\n`
        + `  ${c.blue('git submodule update --remote --merge themes/FixIt')}`,
      )
      p.outro(`Done in ${timer.stop() / 1000}s`)
    })
    .catch((error: Error) => {
      p.log.error(c.red(error.message))
      spinner.stop(`${c.red('✘')} failed to check the latest version of FixIt theme.`, -1)
      p.log.step(`You can set GITHUB_TOKEN env to avoid GitHub API rate limit.\nRun command ${c.blue('fixit help check')} for more details.\n`)
      process.exit(1)
    })
}

export {
  checkAction,
  createAction,
  createComponentAction,
  splitAction,
  tomlToYamlAction,
}
