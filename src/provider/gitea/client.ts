import * as Request from "request";
import { log, Harness } from "@swingletree-oss/harness";
import { inject, injectable } from "inversify";
import { ScottyConfig, ConfigurationService } from "../../configuration";
import { ProviderClient } from "../provider-client";
import * as yaml from "js-yaml";

@injectable()
export class GiteaClient extends ProviderClient {
  private baseUrl: string;

  private readonly client: Request.RequestAPI<Request.Request, Request.CoreOptions, Request.RequiredUriUrl>;

  constructor(
    @inject(ConfigurationService) config: ConfigurationService
  ) {
    super();
    this.baseUrl = config.get(ScottyConfig.Gitea.BASE).replace(/\/+$/, "");
    this.client = Request.defaults({
      headers: {
        Authorization: `token ${config.get(ScottyConfig.Gitea.TOKEN)}`
      },
      baseUrl: this.baseUrl,
      json: true
    });

    log.info("Gitea client configured to use %s", this.baseUrl);
  }

  public sendCommitStatus(coordinates: Harness.GithubSource, commitStatus: CreateCommitStatusRequest) {
    return new Promise<any>((resolve, reject) => {
      if (!(coordinates.owner && coordinates.repo && coordinates.sha)) {
        reject(new Error("git coordinates are incomplete."));
        return;
      }

      const illegalMatcher = /[/\s]/i;
      if (illegalMatcher.test(coordinates.owner) || illegalMatcher.test(coordinates.repo) || illegalMatcher.test(coordinates.sha)) {
        reject(new Error("git coordinates contain invalid characters"));
        return;
      }

      this.client.post(
        `repos/${coordinates.owner}/${coordinates.repo}/statuses/${coordinates.sha}`,
        {
          body: commitStatus
        },
        (error, res) => {
          if (error) {
            log.error("failed to send commit status:\n%j", error);
            reject(new Error(error));
            return;
          }

          if (res.statusCode < 200 || res.statusCode > 299) {
            log.error("server responded with NOK code:\n%j", res.body);
            reject(new Error("server responded with NOK code"));
            return;
          }

          log.info("commit status sent for %s/%s:%s, context: %s, status: %s", coordinates.owner, coordinates.repo, coordinates.sha, commitStatus.context, commitStatus.state);
          resolve(res.body);
        }
      );
    });
  }

  public async getSwingletreeConfigFromRepository(owner: string, repo: string) {
    return new Promise<any>((resolve, reject) => {
      if (!(owner && repo)) {
        reject(new Error("git coordinates are incomplete."));
        return;
      }

      const illegalMatcher = /[/\s]/i;
      if (illegalMatcher.test(owner) || illegalMatcher.test(repo)) {
        reject(new Error("git coordinates contain invalid characters"));
        return;
      }

      this.client.get(
        `repos/${owner}/${repo}/contents/.swingletree.yml`,
        {},
        (error, res) => {
          if (error) {
            log.error("failed to send commit status:\n%j", error);
            reject(new Error(error));
            return;
          }

          if (res.statusCode < 200 || res.statusCode > 299) {
            log.error("server responded with NOK code:\n%j", res.body);
            reject(new Error("server responded with NOK code"));
            return;
          } else if (res.statusCode == 404) {
            log.debug("no repository configuration file found for %s/%s", owner, repo);
            resolve(null);
            return;
          }

          try {
            resolve(yaml.safeLoad(res.body.content).toString());
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }
}

export interface CreateCommitStatusRequest {
  context: string;
  description: string;
  state: StatusState;
  target_url?: string;
}

export enum StatusState {
  PENDING = "pending",
  SUCCESS = "success",
  ERROR = "error",
  FAILURE = "failure",
  WARNING = "warning"
}