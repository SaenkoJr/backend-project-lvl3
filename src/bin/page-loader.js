#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';

program.version('1.0.0');

const handleError = (error) => {
  if (error.config) {
    const errorMsg = [
      error.message,
      `Resource name: ${error.config.url}`,
    ].join('\n');

    return errorMsg;
  }

  return error.message;
};

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
        console.error(handleError(e));
        process.exit(1);
      });
  });

program.parse(process.argv);
