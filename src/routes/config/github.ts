import { injectable, inject } from "inversify";
import EventBus from "../../event/event-bus";
import { Router, Request, Response } from "express";
import { log, Comms, Harness, Events } from "@swingletree-oss/harness";
import NodeCache = require("node-cache");
import GithubClientService from "../../github/client/github-client";

@injectable()
export class GithubRepoConfigWebservice {
  private readonly TTL = 10;

  private cache: NodeCache;

  private readonly github: GithubClientService;

  constructor(
    @inject(GithubClientService) github: GithubClientService
  ) {
    this.cache = new NodeCache({
      stdTTL: this.TTL
    });

    this.github = github;
  }

  public async repoConfigHandler(req: Request, res: Response) {
    const source = new Harness.GithubSource();
    source.owner = req.params.owner;
    source.repo = req.params.repo;

    if (!source.owner || !source.repo) {
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new Comms.BadRequestError(
            "missing owner or repository path parameter"
          )
        )
      );
      return;
    }

    let config;

    try {
      config = await this.get(source.owner, source.repo);
      res.status(200).send({
        data: config
      } as Comms.Message.BasicMessage<any>);
    } catch (err) {
      log.warn("failed to retrieve repository configuration: %s", err);
      res.status(500).send(
        new Comms.Message.ErrorMessage(
          new Comms.Error("Configuration Error", "Could not read repository config. Caused by: " + err)
        )
      );
      return;
    }
  }

  /** Tries to retrieve configuration from cache. On cache miss: retrieve from GitHub
   *
   * @param owner owner of the repo
   * @param repo repository name
   */
  private async get(owner: string, repo: string): Promise<Harness.RawRepositoryConfig> {
    let val: Harness.RawRepositoryConfig = this.cache.get(`${owner}/${repo}`);

    if (val == undefined) {
      log.debug("event config cache miss. Retrieving entry.");
      val = await this.store(owner, repo);
    }

    return val;
  }

  private async store(owner: string, repo: string): Promise<Harness.RawRepositoryConfig> {
    log.debug("retrieving configuration for %s/%s", owner, repo);
    try {
      const config = await this.github.getSwingletreeConfigFromRepository(owner, repo);
      this.cache.set(`${owner}/${repo}`, config);
      return config as Harness.RawRepositoryConfig;
    } catch (err) {
      log.warn("failed to retrieve repository configuration for %s/%s: %s", owner, repo, err);
      return null;
    }
  }

  public getRouter(): Router {
    const router = Router();

    router.get("/:owner/:repo", this.repoConfigHandler.bind(this));

    return router;
  }

}