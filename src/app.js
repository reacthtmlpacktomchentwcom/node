import {
  resolve as resolvePath,
} from "path";

import {
  default as Koa,
} from "koa";

import {
  default as koaLoggerFactory,
} from "koa-logger";

import {
  default as legacyKoaStaticCacheFactory,
} from "koa-static-cache";

import {
  default as legacyKoaStaticFactory,
} from "koa-static";

import {
  default as koaConvert,
} from "koa-convert";

import {
  default as router,
} from "./routes";

const app = new Koa();

app.use(koaLoggerFactory());

app.use(koaConvert(legacyKoaStaticCacheFactory(resolvePath(__dirname, `../public`), {
  // Will NOT serve index.html
  gzip: true,
})));

app.use(koaConvert(legacyKoaStaticFactory(resolvePath(__dirname, `../public`), {
  // Serving index.html ONLY
  index: `index.html`,
})));

app
  .use(router.routes())
  .use(router.allowedMethods());

app.use(async function notFoundMiddleware(context, next) {
  /* eslint-disable no-param-reassign */
  await next();
  if (context.status !== 404) {
    return;
  }
  context.status = 404;
  context.type = `html`;
  context.body = `
<body>
  <p>Not Found</p>
</body>
`;
  /* eslint-enable no-param-reassign */
});

export default app;
