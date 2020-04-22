import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import nock from 'nock';

import pageLoader from '../src';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const fixtureName = 'webpage.html';

let tmpdir;
let expected;

beforeAll(async () => {
  expected = await fs.readFile(getFixturePath(fixtureName), 'utf-8');
});

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('page loader', async () => {
  const url = 'http://www.webpage.com';
  const filename = 'www-webpage-com.html';

  nock(url)
    .get('/')
    .reply(200, expected);

  await pageLoader(url, tmpdir);
  const result = await fs.readFile(path.join(tmpdir, filename), 'utf-8');

  expect(result).toEqual(expected);
});
