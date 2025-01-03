#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'
import {
  checkAction,
  createAction,
  helpAction,
} from '../lib/actions.js'
import { importJson } from '../lib/utils.js'

const pkg = importJson('../../package.json')
const program = new Command()
const logo = `
=============================================

        ▄████  ▄█     ▄  ▄█    ▄▄▄▄▀ 
        █▀   ▀ ██ ▀▄   █ ██ ▀▀▀ █    
        █▀▀    ██   █ ▀  ██     █    
        █      ▐█  ▄ █   ▐█    █     
         █      ▐ █   ▀▄  ▐   ▀      
          ▀        ▀                
              ${chalk.italic(`${pkg.name} v${pkg.version}`)}
         ${chalk.italic(pkg.description)}

=============================================
`
const description = `${chalk.green(logo.replace(/^\n/g, ''))}
FixIt is a clean, elegant but advanced blog theme for Hugo
built with love by Lruihao and his friends.\n
Complete documentation is available at ${chalk.cyan('https://fixit.lruihao.cn/')}.`

// define commands
program
  .command('create <project-name>')
  .description('create a new FixIt project from a template')
  .action(createAction)
program
  .command('check')
  .description('check the latest version of FixIt theme')
  .action(checkAction)
program
  .command('help <command>')
  .description('display help for a specific command')
  .action(helpAction)

// define cli
program
  .usage('<command> [options]')
  .description(description)
  .version(`${pkg.name} v${pkg.version}`, '-v, --version')
  .showHelpAfterError()
  .parse(process.argv)
