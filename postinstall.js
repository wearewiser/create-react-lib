#!/usr/bin/env node
const { readdir, rename } = require("fs/promises");
const { Observable } = require("rxjs");
const { mergeMap, filter, map } = require("rxjs/operators");
const path = require("path");

const COPY_FILES = [
  {
    directory: 'x',
    filepattern: /^\._.*/,
    renameFn: (name) => name.replace(/^\._/, "."),
  },
  {
    directory: 'x',
    filepattern: /^_.*/,
    renameFn: (name) => name.replace(/^_/, ""),
  },
]

COPY_FILES.forEach(({ directory, filepattern, renameFn }) => {
  Observable.from(readdir(directory))
    .pipe(
      mergeMap(files => files),
      filter(src_file => filepattern.test(src_file)),
      map(src_file => ({
        src_file,
        dest_file: renameFn(src_file)
      })),
      mergeMap(({ src_file, dest_file }) => {
        const src = path.join(directory, src_file);
        const dest = path.join(directory, dest_file);
        console.log(`Moving ${src} -> ${dest}`);
        return Observable.from(rename(src, dest));
      })
    )
    .subscribe({
      next: () => {},
      error: console.error,
      complete: () => {}
    });
});
