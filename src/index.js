import path from 'path';
import { promises as fs, createWriteStream } from 'fs';

import cheerio from 'cheerio';
import axios from 'axios';
import { union, words } from 'lodash';
import debug from 'debug';
import Listr from 'listr';
import 'axios-debug-log';

const log = debug('page-loader');

const attrs = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const buildNameFromUrl = (pageUrl) => {
  const { hostname, pathname } = new URL(pageUrl);
  const parts = union(
    words(hostname),
    words(pathname),
  );

  return parts.join('-');
};

const buildHtmlName = (pageUrl) => buildNameFromUrl(pageUrl).concat('.', 'html');
const buildDirName = (pageUrl) => buildNameFromUrl(pageUrl).concat('_', 'files');
const buildResourceName = (resourcePath) => {
  const { dir, base } = path.parse(resourcePath);
  const formatedDirName = words(dir).join('-');

  return formatedDirName.concat('-', base);
};

const isLocalLink = (link, baseUrl) => {
  const { host } = new URL(link, baseUrl);
  const { host: currentHost } = new URL(baseUrl);

  return host === currentHost;
};

const processHtml = (html, pageUrl) => {
  const $ = cheerio.load(html);

  const urls = Object.entries(attrs).flatMap(([tag, attr]) => (
    $(tag)
      .filter((_, el) => $(el).attr(attr))
      .filter((_, el) => isLocalLink($(el).attr(attr), pageUrl))
      .toArray()
      .map((elem) => {
        const link = $(elem).attr(attr);
        const resourcePath = path.join(
          buildDirName(pageUrl),
          buildResourceName(link),
        );

        $(elem).attr(attr, resourcePath);
        log('link has been changed (%o -> %o)', link, resourcePath);

        return new URL(link, pageUrl);
      })
  ));

  return { urls, processedHtml: $.html() };
};

const download = (resourceUrl, outputPath) => axios
  .get(resourceUrl, { responseType: 'stream' })
  .then((res) => (
    res.request.path
      |> buildResourceName
      |> ((filename) => path.join(outputPath, filename))
      |> createWriteStream
      |> res.data.pipe
  ))
  .then(() => log('resource %o has been saved to %o', resourceUrl, outputPath));

export default (pageUrl, outputPath) => {
  log('run app');
  log('download page data from', pageUrl);

  const htmlFilePath = path.join(outputPath, buildHtmlName(pageUrl));
  const resourcesDirName = buildDirName(pageUrl);
  const resourcesDirPath = path.join(outputPath, resourcesDirName);

  return axios
    .get(pageUrl)
    .then(({ data: html }) => {
      const { processedHtml, urls } = processHtml(html, pageUrl);

      return fs.writeFile(htmlFilePath, processedHtml)
        .then(() => log('page has been saved to %o', htmlFilePath))
        .then(() => urls);
    })
    .then((urls) => fs.mkdir(resourcesDirPath)
      .then(() => log('resources directory has been created'))
      .then(() => {
        const tasks = urls.map((url) => ({
          title: `Download ${url}`,
          task: () => download(url.toString(), resourcesDirPath),
        }));

        return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
      }));
};
