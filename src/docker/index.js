import {
  default as Docker,
} from "dockerode";

import {
  default as thenify,
} from "thenify";

const docker = new Docker();

export const run = thenify(::docker.run);

export default docker;

export const runBuild = (dirpath) => (
  run(process.env.DOCKER_BUILD_IMAGE_NAME, [`npm`, `start`], [process.stdout, process.stderr], {
    // https://docs.docker.com/engine/reference/api/docker_remote_api_v1.21/#create-a-container
    Tty: false,
    Env: [
      ...Object.keys(process.env).map(key => `${ key }=${ process.env[key] }`),
      `MOUNT_DIRPATH=${ dirpath }`,
    ],
    HostConfig: {
      Links: [
        `${ process.env.DOCKER_LOCAL_NPM_CONTAINER_NAME }:local-npm`,
      ],
      VolumesFrom: [
        process.env.HOSTNAME, // http://stackoverflow.com/a/26979287
      ],
    },
  })
);
