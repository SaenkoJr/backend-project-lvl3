import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import nock from 'nock';

import pageLoader from '../src';

nock.disableNetConnect();

let tmpdir;

const url = new URL('http://www.webpage.com/somepage/');
const expectedHtmlFileName = 'www-webpage-com-somepage.html';
const expectedResourcesDir = 'www-webpage-com-somepage_files';
const expectedResources = [
  'assets-index.js',
  'assets-webpage.css',
  'images-mounts.jpg',
];

const getFixturePath = (name) => path.join(__dirname, '..', '__fixtures__', name);

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

describe('Page loader', () => {
  test('Download site with all resources', async () => {
    const expected = await fs.readFile(getFixturePath('expected.html'), 'utf-8');

    nock(url.origin)
      .get(url.pathname)
      .replyWithFile(200, getFixturePath('index.html'))
      .get('/images/mounts.jpg')
      .replyWithFile(200, getFixturePath(path.join('images', 'mounts.jpg')))
      .get('/assets/webpage.css')
      .replyWithFile(200, getFixturePath(path.join('assets', 'webpage.css')))
      .get('/assets/index.js')
      .replyWithFile(200, getFixturePath(path.join('assets', 'index.js')));

    await pageLoader(url.toString(), tmpdir);

    const processedHtml = await fs.readFile(path.resolve(tmpdir, expectedHtmlFileName), 'utf-8');
    const processedFiles = await fs.readdir(path.resolve(tmpdir, expectedResourcesDir));

    expect(processedHtml).toEqual(expected.trim());
    expect(processedFiles).toEqual(expectedResources);
  });
});
