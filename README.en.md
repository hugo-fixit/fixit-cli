# FixIt CLI

[![NPM version](https://img.shields.io/npm/v/fixit-cli.svg)](https://www.npmjs.com/package/fixit-cli)

👉 English | [中文](README.md)

🛠️ A node-based tooling for [FixIt](https://github.com/hugo-fixit/FixIt) site initialization.

[![asciicast](/fixit-cli.gif)](https://asciinema.org/a/697494)

## System Requirements

- [Node.js](https://nodejs.org/) (>= 18)
- [Git](https://git-scm.com/)
- [Hugo](https://gohugo.io/) Extended

If you use the [Hugo Modules](https://gohugo.io/hugo-modules/) feature to load the theme, you will also need to install [Go](https://go.dev/dl/).

## Usage

It is very convenient to create a new FixIt project by running `fixit-cli` directly using [`pnpx`](https://pnpm.io/cli/dlx) or [`npx`](https://docs.npmjs.com/cli/v11/commands/npx).

For example, create a new site named `my-blog`:

```bash
pnpx fixit-cli create my-blog
```

Of course, you can also install `fixit-cli` globally and use the `fixit` command.

```bash
npm install -g fixit-cli
# or
pnpm add -g fixit-cli
# or
yarn global add fixit-cli
```

### create

Create a new FixIt project.

```bash
fixit create [project-name]
```

Create a new FixIt component.

```bash
fixit create component [component-name]
```

### split

Split the `hugo.toml` configuration file into the `config/_default` directory.

Split a local file:

```bash
fixit split hugo.toml
```

Split a remote file:

```bash
fixit split https://raw.githubusercontent.com/hugo-fixit/FixIt/refs/heads/main/hugo.toml
# or
fixit split https://gitee.com/lruihao/FixIt/raw/main/hugo.toml
```

### check

Check the latest version of the FixIt theme.

```bash
fixit check
```

## Getting Help

View all available commands:

```bash
pnpx fixit-cli -h
```

```plain
Usage: fixit <command> [options]

=============================================

        ▄████  ▄█     ▄  ▄█    ▄▄▄▄▀
        █▀   ▀ ██ ▀▄   █ ██ ▀▀▀ █
        █▀▀    ██   █ ▀  ██     █
        █      ▐█  ▄ █   ▐█    █
         █      ▐ █   ▀▄  ▐   ▀
          ▀        ▀
              fixit-cli v1.3.7
         A cli tool for FixIt theme.

=============================================

FixIt is a clean, elegant but advanced blog theme for Hugo
built with love by Lruihao and his friends.

Complete documentation is available at https://fixit.lruihao.cn/.

Options:
  -v, --version              output the version number
  -h, --help                 display help for command

Commands:
  create|new [project-name]  create a new FixIt project/component from a template
  split [options] [file]     split hugo.toml into config/_default directory
  check                      check the latest version of FixIt theme
  help [command]             display help for command
```

## Development

Install dependencies:

```bash
pnpm install
```

Run the CLI in development mode:

```bash
pnpm start -h
```

Link/Unlink the package to/from the global package directory:

```bash
pnpm link
pnpm unlink fixit-cli
```

Install/uninstall the package globally from a local path:

```bash
pnpm add -g path/to/fixit-cli
pnpm remove -g fixit-cli
```

### TODO List

- [ ] Add theme component selection options after template selection in `fixit create` command

## Related Projects

This CLI tool is developed based on the following projects:

- [FixIt](https://github.com/hugo-fixit/FixIt)
- [hugo-fixit-starter](https://github.com/hugo-fixit/hugo-fixit-starter)
- [hugo-fixit-starter1](https://github.com/hugo-fixit/hugo-fixit-starter1)
- [component-skeleton](https://github.com/hugo-fixit/component-skeleton)

## Author

[Lruihao](https://github.com/Lruihao "Follow me on GitHub")
