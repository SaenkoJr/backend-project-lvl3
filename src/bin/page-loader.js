#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';

program.version('0.3.0');

program
  .description('Console util for download the specified site')
  .option('-o, --output [directory]', 'specify output directory', process.cwd())
  .arguments('<url>')
  .action((url) => {
    pageLoader(url, program.output)
      .then(() => {
        console.log('Loading is complete');
        process.exit(0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  });

program.parse(process.argv);
