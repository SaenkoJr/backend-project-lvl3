#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';

program.version('0.1.0');

program
  .description('Page loader')
  .option('-o, --output', 'specify output directory')
  .arguments('<url>')
  .action((url) => {
    try {
      const data = pageLoader(url);
      console.log(data);
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });

program.parse(process.argv);
