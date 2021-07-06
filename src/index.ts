import { getInstalledPathSync } from 'get-installed-path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { EOL } from 'os';
import { Transform } from 'stream';
import {
  dirname,
  join,
} from 'path';
import {
  access,
  constants,
  createReadStream,
  createWriteStream,
  lstat,
  mkdir,
  readdir,
  readFile,
  Stats,
} from 'fs';
import * as ora from 'ora';
import * as handlebars from 'handlebars';

const EXE_NAME = 'create-nodets';
const source_dir = join(getInstalledPathSync(EXE_NAME), 'packages', 'nodets');

const sleep = (t: number): Promise<void> =>
  new Promise(
    resolve => setTimeout(resolve, t),
  );
class Handlebars extends Transform {

  private props: any;

  constructor(props: any) {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
    });
    this.props = props;
  }

  // tslint:disable-next-line: function-name
  public _transform(chunk: any, _encoding: string, next: Function) {
    const template = Buffer.from(chunk).toString('utf8');
    const rendered = handlebars.compile(template)(this.props);
    return next(null, rendered);
  }

}

async function getVersion(): Promise<string> {
  return new Promise<string>(
    (resolve, reject) => {
      readFile(`${source_dir}/package.json`, (err, file) => {
        if (err) {
          reject(err);
          return;
        }
        const version = JSON.parse(file.toString('utf8')).version;
        resolve(version);
      });
    },
  );
}

async function precheckOnDir(dir: string, skip_dir_check: boolean): Promise<void> {
  if (await isPathExist(dir)) {
    // is not a directory
    if (!(await isPathDir(dir))) {
      throw new Error(`Specified path "${dir}" is not a directory`);
    }
    // is not accessible
    if (!(await isPathAccess(dir))) {
      throw new Error(`Specified path "${dir}" is not accessible`);
    }
    // is not empty
    if (!skip_dir_check && !(await isDirEmpty(dir))) {
      throw new Error(`Specified path "${dir}" is not empty`);
    }
  }
}

async function precehckOnStatus(dir: string, skip_status_check: boolean): Promise<void> {
  if (!skip_status_check && (await gitStatus(dir)) !== '') {
    let err = `Please commit your changes before running this script!${EOL}`;
    err += `Exiting because \`git status\` is not empty:${EOL}`;
    err += `${EOL}`;
    err += `${await gitStatus(dir)}`;
    err += `${EOL}`;
    throw new Error(err);
  }
}

async function isPathExist(path: string): Promise<boolean> {
  return new Promise<boolean>(
    (resolve, reject) => {
      lstat(path, (err: any) => {
        if (err) {
          if (err.code !== 'ENOENT') {
            reject(err);
            return;
          }
          resolve(false);
          return;
        }
        resolve(true);
      });
    },
  );
}

async function isPathAccess(path: string): Promise<boolean> {
  return new Promise<boolean>(
    (resolve, reject) => {
      access(path, (constants.F_OK | constants.R_OK | constants.W_OK), (err: any) => {
        if (err) {
          if (err.code !== 'EACCES') {
            reject(err);
            return;
          }
          resolve(false);
        }
        resolve(true);
      });
    },
  );
}

async function isPathDir(path: string): Promise<boolean> {
  return new Promise<boolean>(
    (resolve, reject) => {
      lstat(path, (err: any, stats: Stats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stats.isDirectory());
      });
    },
  );
}

async function isDirEmpty(dir: string): Promise<boolean> {
  return new Promise<boolean>(
    (resolve, reject) => {
      readdir(dir, (err: any, files: string[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(files.length < 1);
      });
    },
  );
}

async function gitStatus(path: string): Promise<string> {
  return new Promise(
    (resolve) => {
      exec(`git -C "${path}" status --porcelain`, (err, stdout) => {
        if (err) {
          resolve('');
          return;
        }
        resolve(stdout.toString().trim());
      });
    },
  );
}

async function listFiles(path: string): Promise<string[]> {
  return new Promise(
    (resolve, reject) => {
      readdir(path, async (err: any, children: string[]) => {
        if (err) {
          reject(err);
          return;
        }
        const files: string[][] = await Promise.all(
          children.map(
            child => new Promise<string[]>(
              async (resolve) => {
                const child_path = join(path, child);
                if (await isPathDir(child_path)) {
                  resolve(await listFiles(child_path));
                  return;
                }
                resolve([child_path]);
              },
            ),
          ),
        );
        resolve(files.reduce((a: string[], b: string[]) => [...a, ...b], [] as string[]));
      });
    },
  );
}

async function mkProjectDir(dir: string): Promise<void> {
  return await new Promise<void>(
    (resolve, reject) => {
      mkdir(dir, (err) => {
        if (err && err.code !== 'EEXIST') {
          reject(err);
          return;
        }
        resolve();
      });
    },
  );
}

async function copyFiles(source_dir: string, target_dir: string, params: any): Promise<void> {
  const source_files = await listFiles(source_dir);
  await Promise.all(
    source_files.map(
      source_file => new Promise<void>(
        async (resolve, reject) => {
          const target_file = join(target_dir, source_file.replace(source_dir, ''));
          if (!(await isPathExist(dirname(target_file)))) {
            try {
              await new Promise<void>(
                (resolve, reject) =>
                  mkdir(dirname(target_file), { recursive: true }, (err) => {
                    if (err && err.code !== 'EEXIST') {
                      reject(err);
                      return;
                    }
                    resolve();
                  }),
              );
            } catch (e) {
              reject(e);
              return;
            }
          }
          const write = createWriteStream(target_file);
          const read = createReadStream(source_file);
          write.on('close', resolve);
          read.pipe(new Handlebars(params)).pipe(write);
        },
      ),
    ),
  );
}

async function gitInit(target_dir: string): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      exec(`git -C "${target_dir}" init`, (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout.toString().trim());
      });
    },
  );
}

async function npmInstall(target_dir: string): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      exec(`npm install -C "${target_dir}"`, (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout.toString().trim());
      });
    },
  );
}

async function gitAddAll(target_dir: string): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      exec(`git -C "${target_dir}" add .`, (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout.toString().trim());
      });
    },
  );
}

async function gitCommit(target_dir: string, message: string): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      exec(
        `git -C "${target_dir}" commit -m "${message}"`,
        { maxBuffer: Infinity },
        (err, stdout) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(stdout.toString().trim());
        });
    },
  );
}

(async () => {
  let exit_code = 0;
  console.log();
  console.log('-------------------------------------------------------');
  console.log('Welcome to the TSNode project generator');
  console.log();
  console.log('Your project will be ready shortly');
  console.log('-------------------------------------------------------');
  console.log();
  const version = await getVersion();
  try {
    const program = new Command();
    program
      .version('1.0.2')
      .name(EXE_NAME)
      .usage('{<dir> | (-d|--dir) <directory>} [options...]')
      .description('Send bulk email with distinct body, subject, and attachments')
      .argument('[dir]', 'Project directory')
      .option('-d, --dir <string>', 'Project directory')
      .option('--skip-status-check', 'Skip checking git status in CWD')
      .option('--skip-dir-check', 'Skip checking if project dir is empty')
      .option('--skip-npm', 'Skip installing dependencies')
      .option('--skip-git', 'Skip making first commit');
    program.showHelpAfterError();
    program.parse();
    const options = program.opts();
    const dir = program.args[0] || options.dir;
    const skip_status_check = options.skipStatusCheck;
    const skip_dir_check = options.skipDirCheck;
    const skip_npm = options.skipNpm;
    const skip_git = options.skipGit;
    if (!dir) {
      program.help();
    }
    const log_dir_precheck = ora('Perfoming system precheck on directory');
    try {
      log_dir_precheck.start();
      await Promise.all([
        precheckOnDir(dir, skip_dir_check),
        sleep(1000),
      ]);
      log_dir_precheck.succeed();
    } catch (e) {
      log_dir_precheck.fail();
      throw e;
    }
    const log_precheck_git = ora('Perfoming system precheck on git status');
    try {
      log_precheck_git.start();
      await Promise.all([
        precehckOnStatus(dir, skip_status_check),
        sleep(1000),
      ]);
      log_precheck_git.succeed();
    } catch (e) {
      log_precheck_git.fail();
      throw e;
    }
    const log_mkdir = ora('Creating project directory');
    try {
      log_mkdir.start();
      await Promise.all([
        mkProjectDir(dir),
        sleep(1000),
      ]);
      log_mkdir.succeed();
    } catch (e) {
      log_mkdir.fail();
      throw e;
    }
    const log_copy_files = ora('Setting up project files');
    try {
      log_copy_files.start();
      await Promise.all([
        copyFiles(source_dir, dir, { version, name: dir }),
        sleep(1000),
      ]);
      log_copy_files.succeed();
    } catch (e) {
      log_copy_files.fail();
      throw e;
    }
    if (!skip_npm) {
      const log_dependencies = ora('Installing dependencies');
      try {
        log_dependencies.start();
        await Promise.all([
          npmInstall(dir),
          sleep(1000),
        ]);
        log_dependencies.succeed();
      } catch (e) {
        log_dependencies.fail();
        throw e;
      }
    }
    if (!skip_git) {
      const log_git_init = ora('Initializing git repository');
      try {
        log_git_init.start();
        await Promise.all([
          gitInit(dir),
          sleep(1000),
        ]);
        log_git_init.succeed();
      } catch (e) {
        log_git_init.fail();
        throw e;
      }
      const log_git_commit = ora('Making first commit');
      try {
        log_git_commit.start();
        await gitAddAll(dir);
        await Promise.all([
          gitCommit(dir, `Project ${dir} initialized`),
          sleep(1000),
        ]);
        log_git_commit.succeed();
      } catch (e) {
        log_git_commit.fail();
        throw e;
      }
    }
  } catch (e) {
    console.error(e.message);
    exit_code = 1;
  } finally {
    console.log('done.');
    process.exit(exit_code);
  }
})();
