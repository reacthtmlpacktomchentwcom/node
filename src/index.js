import {
  resolve as resolvePath,
} from "path";

import {
  default as fs,
} from "mz/fs";

import {
  default as http2,
} from "http2";

import {
  default as app,
} from "./app";

const server = http2.createServer({
  // https://devcenter.heroku.com/articles/ssl-certificate-self
  // http://blog.getpostman.com/2014/01/28/using-self-signed-certificates-with-postman/
  key: fs.readFileSync(resolvePath(__dirname, `../localhost.key`)),
  cert: fs.readFileSync(resolvePath(__dirname, `../localhost.crt`)),
}, app.callback());

server.listen(3000);
