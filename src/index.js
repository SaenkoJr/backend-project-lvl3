import path from 'path';
import url from 'url';
import { promises as fs, createWriteStream } from 'fs';

import cheerio from 'cheerio';
import axios from 'axios';
import { union, words } from 'lodash';

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

const isLocalLink = (link, baseUrl) => {
  const { host } = new URL(link, baseUrl);
  const { host: currentHost } = new URL(baseUrl);

  return host === currentHost;
};

const getLinks = (html) => {
  const $ = cheerio.load(html);
  const links = Object.entries(attrs).map(([tag, attr]) => (
    $(tag).toArray().map((elem) => $(elem).attr(attr))
  ));

  return links.flat();
};

const modifyLocalLinks = (html, pageUrl) => {
  const $ = cheerio.load(html);

  Object.entries(attrs).forEach(([tag, attr]) => {
    $(tag).each((_, elem) => {
      const link = $(elem).attr(attr);

      if (isLocalLink(link, pageUrl)) {
        const resourcePath = path.join(
          buildDirName(pageUrl),
          buildResourceName(link),
        );

        $(elem).attr(attr, resourcePath);
      }
    });
  });

  return $.html();
};

const download = (resourceUrl, outputPath) => axios
  .get(resourceUrl, { responseType: 'stream' })
  .then((res) => res.request.path
      |> buildResourceName
      |> ((filename) => path.join(outputPath, filename))
      |> createWriteStream
      |> res.data.pipe);

export default (pageUrl, outputPath) => axios
  .get(pageUrl)
  .then(({ data }) => data)
  .then((html) => {
    const links = getLinks(html);

    const htmlFilePath = path.join(outputPath, buildHtmlName(pageUrl));
    const resourcesDirPath = path.join(outputPath, buildDirName(pageUrl));
    const modifiedHtml = modifyLocalLinks(html, pageUrl);

    return fs.writeFile(htmlFilePath, modifiedHtml)
      .then(() => (
        pageUrl
          |> buildDirName
          |> ((dirname) => path.join(outputPath, dirname))
          |> fs.mkdir
      ))
      .then(() => {
        const promises = links
          .filter((link) => isLocalLink(link, pageUrl))
          .map((link) => {
            const resourceUrl = new URL(link, pageUrl);
            return download(resourceUrl.toString(), resourcesDirPath);
          });
        return Promise.all(promises);
      });
  });
