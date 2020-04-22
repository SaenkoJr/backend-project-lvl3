import path from 'path';
import { parse } from 'url';
import { promises as fs } from 'fs';

import { union } from 'lodash';
import axios from 'axios';

const buildFilename = (url) => {
  const { hostname, pathname } = parse(url);
  const words = union(
    hostname.split('.'),
    pathname.split('/'),
  );

  return words
    .filter((word) => word.length > 0)
    .join('-');
};

export default (pageUrl, outputPath) => axios.get(pageUrl)
  .then((response) => response.data)
  .then((content) => {
    const filename = `${buildFilename(pageUrl)}.html`;
    const filepath = path.join(outputPath, filename);

    return fs.appendFile(filepath, content);
  });
