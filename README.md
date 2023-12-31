# FixIt CLI

[![NPM version](https://img.shields.io/npm/v/fixit-cli.svg)](https://www.npmjs.com/package/fixit-cli)

👉 中文 | [English](README.en.md)

🛠️ 一个基于 Node.js 开发的用于 [FixIt](https://github.com/hugo-fixit/FixIt) 站点初始化的脚手架工具。

## 系统依赖

- [Node.js](https://nodejs.org/) (>= 16.0.0)
- [Git](https://git-scm.com/)
- [Hugo](https://gohugo.io/) 扩展版 (>= 0.109.0)

## 安装

```bash
npm install -g fixit-cli
```

## 使用

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

例如，创建一个名为 `my-blog` 的站点：

```bash
fixit create my-blog
```

## 开发

```bash
npm install
npm link
npm unlink fixit
npm run test -- -h
```

## 相关项目

- [FixIt](https://github.com/hugo-fixit/FixIt)
- [hugo-fixit-blog-git](https://github.com/hugo-fixit/hugo-fixit-blog-git)
- [hugo-fixit-blog-go](https://github.com/hugo-fixit/hugo-fixit-blog-go)

## 作者

[Lruihao](https://github.com/Lruihao "在 GitHub 上关注我")
