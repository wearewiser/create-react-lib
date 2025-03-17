# @wiser/create-react-lib

A utility for initializing React Libraries written in TypeScript and compiled with Webpack.

## Usage

```bash
npm init @wiser/react-lib <dir>
```

for more information

```bash

-------------------------------------------------------
Welcome to Wiser's react component pkg generator
-------------------------------------------------------

Usage: npm init @wiser/react-lib {<dir> | (-d|--dir) <directory>} [options...]

Get started building react libraries.

Arguments:
  dir                  Project directory

Options:
  --version            output the version number
  -d, --dir <string>   Project directory
  -o, --org <string>   Organization scope
  --skip-status-check  Skip checking git status in CWD
  --skip-dir-check     Skip checking if project dir is empty
  --skip-npm           Skip installing dependencies
  --skip-git           Skip making first commit
  -h, --help           display help for command
```

## Development

Clone the repository

```bash
git clone git@github.com:wearewiser/create-react-lib.git
```

Then update the git submodules

```bash
git submodule update --init --recursive
```

If you pack locally, the prepack script will cause you to need to reinitialize the submodules:

```bash
git submodule update --init packages/react-lib
```