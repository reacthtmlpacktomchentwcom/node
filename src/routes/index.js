/* eslint-disable no-param-reassign */

import {
  default as assert,
} from "assert";

import {
  resolve as resolvePath,
} from "path";

import {
  default as fs,
} from "mz/fs";

import {
  default as KoaRouter,
} from "koa-router";

import {
  default as koaBodyParserFactory,
} from "koa-bodyparser";

import {
  default as thenify,
} from "thenify";

import {
  default as streamToArray,
} from "stream-to-array";

import {
  mkdir as nodeCreateTempdir,
} from "temp";

import {
  default as nodeMkdirp,
} from "mkdirp";

import {
  default as nodeRimraf,
} from "rimraf";

import {
  default as nodeGlob,
} from "glob";

import {
  default as redis,
} from "redis";

import {
  default as sse,
} from "sse-stream";

import {
  runBuild,
} from "../docker";

const createTempdir = thenify(nodeCreateTempdir);
const mkdirp = thenify(nodeMkdirp);
const rimraf = thenify(nodeRimraf);
const glob = thenify(nodeGlob);

const REDIS_HOST = `redis`;
const FS_ENCODING = `utf8`;

const router = new KoaRouter();

router.use(`/`, koaBodyParserFactory());

router.post(`/`, async function buildRequest(context, next) {
  const dirpath = await createTempdir({
    dir: resolvePath(__dirname, `../../tmp`),
    prefix: `build-`,
  });
  const [srcPath, publicPath] = await Promise.all([
    mkdirp(resolvePath(dirpath, `./src`)),
    mkdirp(resolvePath(dirpath, `./public`)),
  ]);

  const { source, uuid } = context.request.body;
  await fs.writeFile(resolvePath(srcPath, `./index.html`), source, FS_ENCODING);

  await runBuild(dirpath);

  const redisClient = redis.createClient({ host: REDIS_HOST });
  const publishCode = (name, content) => {
    redisClient.publish(uuid, JSON.stringify({ name, content }));
  };

  const indexHTML = await fs.readFile(resolvePath(publicPath, `./index.html`), FS_ENCODING);
  context.type = `html`;
  context.body = indexHTML;
  publishCode(`index.html`, indexHTML);

  const pushPromiseList = (await glob(`**/*.*`, { cwd: publicPath }))
    .filter(it => it !== `index.html`)
    .map(it => {
      const push = context.res.push(`/${ it }`);
      push.writeHead(200);

      const stream = fs.createReadStream(resolvePath(publicPath, `./${ it }`));
      stream.pipe(push);

      return streamToArray(stream).then(array => {
        publishCode(it, Buffer.concat(array).toString(FS_ENCODING));
      });
    });

  await Promise.all(pushPromiseList);

  redisClient.end(true);

  await rimraf(dirpath);
});

router.get(`/events/:uuid`, async function getEventsRequest(context, next) {
  context.req.setTimeout(Number.MAX_VALUE);
  context.type = `text/event-stream; charset=utf-8`;
  context.set(`Cache-Control`, `no-cache`);

  const stream = context.body = sse();
  const { uuid } = context.params;
  const redisClient = redis.createClient({ host: REDIS_HOST });

  redisClient.on(`message`, (channel, message) => {
    assert.equal(channel, uuid);
    stream.write(message);
  });
  redisClient.subscribe(uuid);
  stream.write(`\n`);
});

export default router;
