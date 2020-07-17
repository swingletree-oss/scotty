import * as yaml from "js-yaml";
import { injectable } from "inversify";
import { log, Configuration } from "@swingletree-oss/harness";
import * as nconf from "nconf";

@injectable()
export class ConfigurationService extends Configuration {
  constructor(file = "./swingletree.conf.yaml") {
    super(file, /((SCOTTY|LOG)_.*)$/i);
  }
}

export namespace ScottyConfig {
  export enum Github {
    APPID = "scotty:github:app:id",
    KEYFILE = "scotty:github:app:keyfile",
    BASE = "scotty:github:base",
    WEBHOOK_SECRET = "scotty:github:secret",
    APP_PUBLIC_PAGE = "scotty:github:app:page",
    CLIENT_DEBUG = "scotty:github:debug"
  }

  export const PROVIDER = "scotty:provider";

  export enum Gitea {
    BASE = "scotty:gitea:base",
    TOKEN = "scotty:gitea:token"
  }

  export enum Storage {
    DATABASE = "scotty:storage:host",
    PASSWORD = "scotty:storage:password"
  }

  export enum Elastic {
    ENABLED = "scotty:elastic:enabled",
    NODE = "scotty:elastic:node",
    AUTH = "scotty:elastic:auth",
    INDEX = "scotty:elastic:index"
  }

  export enum Scotty {
    PORT = "scotty:port"
  }
}
