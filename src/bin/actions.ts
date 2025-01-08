import type {
  CloneOptions,
  SimpleGit,
  SimpleGitProgressEvent,
} from 'simple-git'
import fs from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'picocolors'
import shell from 'shelljs'
import {
  CleanOptions,
  simpleGit,
} from 'simple-git'
import {
  getLatestRelease,
  timer,
} from '../lib/utils.js'

/**
 * action for create command
 * @example fixit create [project-name]
 */
async function createAction() {
  timer.start('Creating a new FixIt project step by step!')
  const repositories = {
    go: 'https://github.com/hugo-fixit/hugo-fixit-starter.git',
    git: 'https://github.com/hugo-fixit/hugo-fixit-starter1.git',
  }
  const answers = await p.group(
    {
      name: () => p.text({
        message: 'Please input project name:',
        placeholder: 'project name',
        initialValue: process.argv[3] || '',
        validate: (val: string) => {
          if (val === '') {
            return 'project name is required!'
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
  p.log.step(`Initializing FixIt project ${answers.name}, please wait a moment...`)
  // 1. download template
  const spinnerClone = p.spinner()
  spinnerClone.start(`Template downloading from ${c.cyan(repositories[answers.template])}.`)
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
  git.clone(repositories[answers.template], answers.name, cloneOptions, (err) => {
    if (err) {
      spinnerClone.stop(err.message, -1)
      return
    }
    spinnerClone.stop(`${c.green('✔')} Template downloaded from ${c.cyan(repositories[answers.template])}`, 0)
    const siteTime = new Date().toISOString()

    // 2. initialize FixIt project
    const spinnerInit = p.spinner()
    spinnerInit.start(`Initializing FixIt project ${answers.name}.`)
    // remove remote origin
    git.cwd(answers.name)
    spinnerInit.message('Removing remote origin.')
    git.removeRemote('origin', (err) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message(`${c.green('✔')} removed remote origin.`)
    })
    // initialize Hugo module
    if (answers.template === 'go') {
      spinnerInit.message('Initializing Hugo module.')
      // go.mod
      const goMod = join(process.cwd(), answers.name, 'go.mod')
      fs.readFile(goMod, 'utf8', (err, data) => {
        if (err) {
          spinnerInit.stop(err.message, -1)
          return
        }
        spinnerInit.message('Modifying module path in go.mod.')
        const result = data.replace(/module .*/, `module ${hugoModulePath}`)
        fs.writeFile(goMod, result, 'utf8', (err) => {
          if (err) {
            spinnerInit.stop(err.message, -1)
            return
          }
          spinnerInit.message(`${c.green('✔')} modified module path in go.mod.`)
        })
      })
    }
    // initialize hugo config
    const hugoToml = join(process.cwd(), answers.name, 'config/_default/hugo.toml')
    fs.readFile(hugoToml, 'utf8', (err, data) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message('Modifying baseURL parameter in hugo.toml.')
      let result = data.replace(/baseURL = ".*"/, 'baseURL = "https://example.org/"')
      if (answers.blogTitle) {
        spinnerInit.message('Modifying title parameter in hugo.toml.')
        result = result.replace(/title = ".*"/, `title = "${answers.blogTitle}"`)
      }
      fs.writeFile(hugoToml, result, 'utf8', (err) => {
        if (err) {
          spinnerInit.stop(err.message, -1)
          return
        }
        spinnerInit.message(`${c.green('✔')} modified baseURL and title in hugo.toml.`)
      })
    })
    // initialize Fixit params.toml
    const paramsToml = join(process.cwd(), answers.name, 'config/_default/params.toml')
    fs.readFile(paramsToml, 'utf8', (err, data) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message('Modifying site time in params.toml.')
      let result = data.replace(
        /value = "" # e.g. "2021-12-18T16:15:22\+08:00"/,
        `value = "${siteTime}" # e.g. "2021-12-18T16:15:22+08:00"`,
      )
      result = result.replace(/since = \d+/, `since = ${new Date().getFullYear()}`)
      if (answers.authorName || answers.authorEmail || answers.authorLink) {
        spinnerInit.message('Modifying author info in params.toml.')
        result = result.replace(
          /\[author\]\n.*\n.*\n.*\n/,
          `[author]\n  name = "${answers.authorName || ''}"\n  email = "${answers.authorEmail || ''}"\n  link = "${answers.authorLink || ''}"\n`,
        )
      }
      spinnerInit.message('Modifying logo in params.toml.')
      result = result.replace(/logo = ".*"/, 'logo = "/images/fixit.min.svg"')
      fs.writeFile(paramsToml, result, 'utf8', (err) => {
        if (err) {
          spinnerInit.stop(err.message, -1)
          return
        }
        spinnerInit.message(`${c.green('✔')} modified site time and author info etc. in params.toml.`)
      })
    })
    // initialize hello world post create time
    const helloMd = join(process.cwd(), answers.name, 'content/posts/hello-world.md')
    fs.readFile(helloMd, 'utf8', (err, data) => {
      if (err) {
        spinnerInit.stop(err.message, -1)
        return
      }
      spinnerInit.message('Modifying create time in hello-world.md.')
      const result = data.replace(
        /date: .*/,
        `date: ${siteTime}`,
      )
      fs.writeFile(helloMd, result, 'utf8', (err) => {
        if (err) {
          spinnerInit.stop(err.message, -1)
          return
        }
        spinnerInit.message(`${c.green('✔')} modified create time in hello-world.md.`)
      })
    })
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
      spinnerInit.stop(`${c.green('✔')} FixIt project ${answers.name} initialized!`, 0)
      p.log.success('🎉 Congratulations! You have created a new FixIt project.')
      const run = await p.confirm({
        message: '🚀 Do you want to start the development server now?',
      })
      if (!run) {
        p.log.info(`Run ${c.blue(`cd ${answers.name} && hugo server -O`)} to start the development server.`)
        p.outro(`Done in ${timer.stop() / 1000}s`)
        process.exit(0)
      }
      // 3. start development server
      p.log.step('Starting the development server...')
      if (!shell.which('hugo')) {
        p.log.error(`${c.red('Hugo is not installed. You need to install Hugo to start this project!')}`)
        p.log.info(`After installing Hugo, run ${c.blue(`cd ${answers.name} && hugo server -O`)} to start the development server.`)
        p.outro(`Done in ${timer.stop() / 1000}s`)
        // TODO install hugo-bin or hugo-extended automatically
        process.exit(1)
      }
      p.log.info(`> ${c.blue(`cd ${answers.name} && hugo server -O`)}`)
      p.outro(`Done in ${timer.stop() / 1000}s`)
      shell.cd(answers.name)
      shell.exec('hugo server -O')
    })
  })
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
    .then(({ version, changelog, homeUrl }) => {
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
}
