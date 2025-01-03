import type {
  CloneOptions,
  SimpleGit,
  SimpleGitProgressEvent,
} from 'simple-git'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'picocolors'
import {
  CleanOptions,
  simpleGit,
} from 'simple-git'
import { getLatestRelease } from '../lib/utils.js'

/**
 * action for create command
 * @example fixit create [project-name]
 */
async function createAction() {
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
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )
  const repositories = {
    go: 'https://github.com/hugo-fixit/hugo-fixit-starter.git',
    git: 'https://github.com/hugo-fixit/hugo-fixit-starter1.git',
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
  // TODO try to performance submodules download by fixit update command
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
    spinnerInit.message('Removing history commits.')
    // remove history commits
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
      if (run) {
        // TODO run command
        p.outro(`Run ${c.blue(`cd ${answers.name} && hugo server -O`)} to start the development server.`)
      }
      else {
        p.outro(`Run ${c.blue(`cd ${answers.name} && hugo server -O`)} to start the development server.`)
      }
    })
  })
}

/**
 * action for check command
 * @example fixit check
 * @example GITHUB_TOKEN=ghp_ifbeKixxxxxxxxxxxxxxxxxxxxxxxx0gVAgF fixit check
 */
function checkAction() {
  const spinner = p.spinner()
  spinner.start('Checking the latest version of FixIt theme.')
  getLatestRelease('hugo-fixit', 'FixIt')
    .then(({ version, changelog, homeUrl }) => {
      spinner.stop(`${c.green('✔')} The latest version of FixIt theme is ${c.blue(version)}.`, 0)
      p.log.info(`Release Notes: ${c.cyan(homeUrl)}\n\n${changelog.split('\n').map(line => c.gray(line)).join('\n')}`)
      p.log.step(
        `You can use commands below to update FixIt theme to the latest version.\n`
        + `${c.gray('Hugo module:')}\n`
        + `  ${c.blue(`hugo mod get -u github.com/hugo-fixit/FixIt@${version}`)}\n`
        + `  ${c.blue('hugo mod tidy')}\n`
        + `${c.gray('Git submodule:')}\n`
        + `  ${c.blue('git submodule update --remote --merge themes/FixIt')}\n`,
      )
      // TODO run command to update theme
    })
    .catch((error) => {
      spinner.stop(`${c.red('[Failed]')} failed to check the latest version of FixIt theme.`, -1)
      p.log.error(c.red(error))
      p.log.step(`\n${c.green('[Note]')} You can set GITHUB_TOKEN env to avoid GitHub API rate limit.\nRun command ${c.blue('fixit help check')} for more details.\n`)
      process.exit(1)
    })
}

/**
 * action for help command
 * @param {string} command specific command
 * @example fixit help <command>
 */
function helpAction(command: string) {
  switch (command) {
    case 'create':
      p.intro('Create a new FixIt project from a template based on Git submodule or Hugo module.')
      p.log.info(`Usage: ${c.blue('fixit create <project-name>')}\n`)
      break
    case 'check':
      p.intro('Check the latest version of FixIt theme.')
      p.log.info(`Usage: ${c.blue('[GITHUB_TOKEN=xxx] fixit check')}`)
      p.log.step(
        c.gray('You can set GITHUB_TOKEN env to avoid GitHub API rate limit.\n')
        + c.gray('Head to ')
        + c.cyan('https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token\n')
        + c.gray('for guidance on how to create a personal access token.\n'),
      )
      break
    case 'help':
      p.intro('Display help for a specific command.')
      p.log.info(`Usage: ${c.blue('fixit help <command>')}\n`)
      break
    default:
      p.intro(`Unknown help topic ${c.red(command)}.`)
      p.log.warn(`Refer to ${c.blue('fixit --help')} for supported commands.\n`)
  }
}

export {
  checkAction,
  createAction,
  helpAction,
}
