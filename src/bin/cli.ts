#!/usr/bin/env node

import process from 'node:process'
import { Command } from 'commander'
import c from 'picocolors'
import { importJson } from '../lib/utils.js'
import {
  checkAction,
  createAction,
} from './actions.js'

const pkg = importJson('/package.json')
const program = new Command()
const logo = `
=============================================

        ▄████  ▄█     ▄  ▄█    ▄▄▄▄▀ 
        █▀   ▀ ██ ▀▄   █ ██ ▀▀▀ █    
        █▀▀    ██   █ ▀  ██     █    
        █      ▐█  ▄ █   ▐█    █     
         █      ▐ █   ▀▄  ▐   ▀      
          ▀        ▀                
              ${c.italic(`${pkg.name} v${pkg.version}`)}
         ${c.italic(pkg.description)}

=============================================
`
const description = `${c.green(logo.replace(/^\n/g, ''))}
FixIt is a clean, elegant but advanced blog theme for Hugo
built with love by Lruihao and his friends.\n
Complete documentation is available at ${c.cyan('https://fixit.lruihao.cn/')}.`

// define commands
program
  .command('create')
  .alias('new')
  .description('create a new FixIt project from a template')
  .argument('[project-name]', 'FixIt project name, e.g. `my-blog`')
  .helpOption(false)
  .action(createAction)
program
  .command('check')
  .description('check the latest version of FixIt theme')
  .helpOption(false)
  .action(checkAction)

// define cli
program
  .name('fixit')
  .usage('<command> [options]')
  .description(description)
  .version(`${pkg.name} v${pkg.version}`, '-v, --version')
  .showHelpAfterError()
  // .action(createAction)
  .parse(process.argv)
