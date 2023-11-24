#!/usr/bin/env node
import { Command } from 'commander'
import inquirer from 'inquirer'
import download from 'download-git-repo'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const program = new Command()
const logo = 
`
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

const createAction = () => {
  inquirer
    .prompt([
      {
        type: 'input',
        message: '请输入项目名称',
        name: 'name',
      },
      {
        type: 'list',
        message: '请选择项目模板',
        name: 'template',
        choices: [
          'Based on Git submodule',
          'Based on Go module',
        ],
      },
    ])
    .then((answers) => {
      console.log(`正在初始化项目${answers.name}，请稍等`)
      const spinner = ora('download template......').start()
      console.log(answers.template)
      setTimeout(() => {
        console.log(chalk.green('Success!'))
        spinner.succeed()
      }, 1000)
      // download(remote, tarName, { clone: true }, function (err) {
      //   if (err) {
      //     console.log(chalk.red(err))
      //     spinner.fail()
      //   } else {
      //     console.log(chalk.green('成功'))
      //     spinner.succeed()
      //   }
      // })
    })
}

// define commands
program
  .command('create <project>')
  .description('create a new FixIt project from a template')
  .action(createAction)

program
  .command('update')
  .description('update the FixIt theme to the latest version')
  .action(() => {
    console.log('update')
  })

program
  .command('help <command>')
  .description('display help for a specific command')
  .action((command) => {
    switch (command) {
      case 'create':
        console.log('Create a new FixIt project from a template based on Git submodule or Hugo module.')
        console.log(`Usage: ${chalk.blue('fixit create <project-name>')}`)
        break
      case 'update':
        console.log('Update the FixIt theme to the latest version for current project.')
        console.log(`Usage: ${chalk.blue('fixit update')}`)
        break
      case 'help':
        console.log('Display help for a specific command.')
        console.log(`Usage: ${chalk.blue('fixit help <command>')}`)
        break
      default:
        console.log(`Unknown help topic ${chalk.red(command)}.`)
        console.log(`Refer to ${chalk.blue('fixit --help')} for supported commands.`)
    }
  })

// define options
program
  .option('-l, --latest', 'check the latest version of FixIt theme')

// define cli
program
  .usage('<command> [options]')
  .description(description)
  .version(`${pkg.name} v${pkg.version}`, '-v, --version')
  .showHelpAfterError()
  .parse(process.argv)
