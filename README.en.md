# FixIt CLI

[![NPM version](https://img.shields.io/npm/v/fixit-cli.svg)](https://www.npmjs.com/package/fixit-cli)

👉 English | [中文](README.md)

🛠️ A node-based tooling for [FixIt](https://github.com/hugo-fixit/FixIt) site initialization.

## System Requirements

- [Node.js](https://nodejs.org/) (>= 16.0.0)
- [Git](https://git-scm.com/)
- [Hugo](https://gohugo.io/) extended

If you use the [Hugo Modules](https://gohugo.io/hugo-modules/) feature to load the theme, you will also need to install [Go](https://go.dev/dl/).

## Installation

```bash
npm install -g fixit-cli
```

## Usage

```plain
Usage: fixit <command> [options]

Options:
  -v, --version          output the version number
  -h, --help             display help for command

Commands:
  create <project-name>  create a new FixIt project from a template
  check                  check the latest version of FixIt theme
  help <command>         display help for a specific command
```

For example, create a site named `my-blog`:

```bash
fixit create my-blog
```

## Development

```bash
npm install
npm link
npm unlink fixit
npm run start -- -h
```

## Related Projects

- [FixIt](https://github.com/hugo-fixit/FixIt)
- [hugo-fixit-starter](https://github.com/hugo-fixit/hugo-fixit-starter)
- [hugo-fixit-starter1](https://github.com/hugo-fixit/hugo-fixit-starter1)

## Author

[Lruihao](https://github.com/Lruihao "Follow me on GitHub")
