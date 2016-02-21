/* eslint-disable no-console */
import {
  default as fs,
} from "mz/fs";

import {
  default as thenify,
} from "thenify";

import {
  default as http2,
} from "http2";

import {
  default as app,
} from "./app";

function getSecretPathname() {
  if (process.env.NODE_ENV === `production`) {
    return `/opt/secret/production`;
  } else {
    return `/opt/secret/localhost`;
  }
}

async function startServer() {
  const pathname = getSecretPathname();
  // https://devcenter.heroku.com/articles/ssl-certificate-self
  // http://blog.getpostman.com/2014/01/28/using-self-signed-certificates-with-postman/
  const [key, cert] = await Promise.all([
    fs.readFile(`${ pathname }.key`),
    fs.readFile(`${ pathname }.crt`),
  ]);

  const server = http2.createServer({
    key,
    cert,
  }, app.callback());

  return thenify(::server.listen)(3000);
}

startServer().then(::console.log, ::console.error);
