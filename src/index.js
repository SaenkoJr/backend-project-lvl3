import path from 'path';
import url from 'url';
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
  const { hostname, pathname } = url.parse(pageUrl);
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

const isResourceLink = (link) => {
  const { ext } = path.parse(link);
  return ext.length > 0;
};

const isLocalLink = (link, baseUrl) => {
  const { host } = new URL(link, baseUrl);
  const { host: currentHost } = new URL(baseUrl);

  return host === currentHost;
};

const getLinks = (html) => {
  const $ = cheerio.load(html);
  const links = Object.entries(attrs).map(([tag, attr]) => (
    $(tag)
      .filter((_, el) => $(el).attr(attr))
      .toArray()
      .map((elem) => $(elem).attr(attr))
  ));

  return links.flat();
};

const modifyLocalLinks = (html, pageUrl) => {
  const $ = cheerio.load(html);

  Object.entries(attrs).forEach(([tag, attr]) => {
    $(tag)
      .filter((_, el) => $(el).attr(attr))
      .each((_, elem) => {
        const link = $(elem).attr(attr);

        if (isLocalLink(link, pageUrl)) {
          const resourcePath = path.join(
            buildDirName(pageUrl),
            buildResourceName(link),
          );

          log('link has been changed (%o -> %o)', link, resourcePath);

          $(elem).attr(attr, resourcePath);
        }
      });
  });

  return $.html();
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

  return axios
    .get(pageUrl)
    .then(({ data }) => data)
    .then((html) => {
      const htmlFilePath = path.join(outputPath, buildHtmlName(pageUrl));
      const modifiedHtml = modifyLocalLinks(html, pageUrl);

      return fs.writeFile(htmlFilePath, modifiedHtml)
        .then(() => log('page has been saved to %o', htmlFilePath))
        .then(() => html);
    })
    .then((html) => {
      const localLinks = getLinks(html)
        .filter(isResourceLink)
        .filter(((link) => isLocalLink(link, pageUrl)))
        .map((link) => new URL(link, pageUrl));

      const resourcesDirName = buildDirName(pageUrl);
      const resourcesDirPath = path.join(outputPath, resourcesDirName);

      return fs.mkdir(resourcesDirPath)
        .then(() => log('resources directory has been created'))
        .then(() => ({ localLinks, resourcesDirPath }));
    })
    .then(({ localLinks, resourcesDirPath }) => {
      const tasks = new Listr([], { concurrent: true, exitOnError: false });

      localLinks.forEach((link) => {
        const newTask = {
          title: `Download ${link}`,
          task: () => download(link.toString(), resourcesDirPath),
        };

        tasks.add(newTask);
      });

      return tasks;
    })
    .then((tasks) => tasks.run());
};
