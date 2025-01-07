# FixIt CLI

[![NPM version](https://img.shields.io/npm/v/fixit-cli.svg)](https://www.npmjs.com/package/fixit-cli)

👉 English | [中文](README.md)

🛠️ A node-based tooling for [FixIt](https://github.com/hugo-fixit/FixIt) site initialization.

## System Requirements

- [Node.js](https://nodejs.org/) (>= 18)
- [Git](https://git-scm.com/)
- [Hugo](https://gohugo.io/) extended

If you use the [Hugo Modules](https://gohugo.io/hugo-modules/) feature to load the theme, you will also need to install [Go](https://go.dev/dl/).

## Usage

It is very convenient to create a new FixIt project by running `fixit-cli` directly using [`pnpx`](https://pnpm.io/cli/dlx) or [`npx`](https://docs.npmjs.com/cli/v11/commands/npx). Of course, you can also install `fixit-cli` globally and use the `fixit` command.

For example, create a site called `my-blog`:

```bash
pnpx fixit-cli create my-blog
```

For more usage, please refer to the help information below:

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

## Related Projects

This CLI tool is developed based on the following projects:

- [FixIt](https://github.com/hugo-fixit/FixIt)
- [hugo-fixit-starter](https://github.com/hugo-fixit/hugo-fixit-starter)
- [hugo-fixit-starter1](https://github.com/hugo-fixit/hugo-fixit-starter1)

## Author

[Lruihao](https://github.com/Lruihao "Follow me on GitHub")
