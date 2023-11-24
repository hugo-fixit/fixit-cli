#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs'
import {
  createAction,
  updateAction,
  helpAction,
} from '../lib/actions.js'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
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
  .command('update')
  .description('update the FixIt theme to the latest version')
  .action(updateAction)
program
  .command('help <command>')
  .description('display help for a specific command')
  .action(helpAction)

// define options
program.option('-l, --latest', 'check the latest version of FixIt theme')

// define cli
program
  .usage('<command> [options]')
  .description(description)
  .version(`${pkg.name} v${pkg.version}`, '-v, --version')
  .showHelpAfterError()
  .parse(process.argv)
