#!/usr/bin/env node

import process from 'node:process'
import { Command } from 'commander'
import c from 'picocolors'
import { importJson } from '../lib/utils.js'
import {
  checkAction,
  createAction,
  createComponentAction,
  splitAction,
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

// define subcommand `create component` under `create`
const createComponentCmd = new Command('component')
  .alias('cmpt')
  .description('create a new component from a template')
  .argument('[component-name]', 'name of the component to create')
  .action(createComponentAction)

// define commands
program
  .command('create')
  .alias('new')
  .usage('[project-name]|<command>')
  .description('create a new FixIt project/component from a template')
  .argument('[project-name]', 'FixIt project name, e.g. `my-blog`')
  .helpOption(false)
  .action(createAction)
  .addCommand(createComponentCmd)
program
  .command('split')
  .description('split hugo.toml into config/_default directory')
  .argument('[file]', 'Input configuration file (local path or URL)', 'hugo.toml')
  .option('-o, --output <dir>', 'Output directory', 'config/_default')
  .helpOption(false)
  .action(splitAction)
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
  .parse(process.argv)
