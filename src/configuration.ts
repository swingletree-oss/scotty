import * as yaml from "js-yaml";
import { injectable } from "inversify";
import { log } from "@swingletree-oss/harness";
import * as nconf from "nconf";

@injectable()
export class ConfigurationService {
  private config: nconf.Provider;

  constructor(file = "./swingletree.conf.yaml") {
    log.info("loading configuration from file %s", file);

    this.config = new nconf.Provider()
      .env({
        lowerCase: true,
        separator: "_",
        match: /((SCOTTY|LOG)_.*)$/i
      })
      .file({
        file: file,
        format: {
          parse: yaml.safeLoad,
          stringify: yaml.safeDump
        }
      });
  }

  public checkRequired(keys: string[]) {
    this.config.required(keys);
  }

  public get(key: string): string {
    const value: string = this.config.get(key);

    if (!value || value.toString().trim() == "") {
      return null;
    }

    return value;
  }

  public getObject(key: string): any {
    return this.config.get(key);
  }

  public getConfig() {
    return this.config.get();
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  public getBoolean(key: string): boolean {
    return String(this.get(key)) == "true";
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
