import * as fs from "fs";

import { inject } from "inversify";
import { injectable } from "inversify";

import { ConfigurationService, ScottyConfig } from "../../configuration";

import InstallationStorage from "./installation-storage";
import TokenStorage from "./token-storage";
import { log } from "@swingletree-oss/harness";

import { Octokit } from "@octokit/rest";
const { createAppAuth } = require("@octokit/auth-app");

import * as yaml from "js-yaml";

@injectable()
class GithubClientService {
  private installationStorage: InstallationStorage;
  private tokenStorage: TokenStorage;
  private key: string;
  private clientLogConfig: object = {};

  private baseUrl: string;
  private appId: string;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService,
    @inject(TokenStorage) tokenStorage: TokenStorage,
    @inject(InstallationStorage) installationStorage: InstallationStorage
  ) {
    this.key = fs.readFileSync(configurationService.get(ScottyConfig.Github.KEYFILE)).toString();

    this.tokenStorage = tokenStorage;
    this.installationStorage = installationStorage;

    this.appId = configurationService.get(ScottyConfig.Github.APPID);
    this.baseUrl = configurationService.get(ScottyConfig.Github.BASE).replace(/\/+$/, ""); // remove trailing slashes
    log.info("Github client configured to use %s", this.baseUrl);

    if (configurationService.getBoolean(ScottyConfig.Github.CLIENT_DEBUG)) {
      this.clientLogConfig = console;
    }
  }

  public async getInstallations(): Promise<Octokit.AppsListInstallationsResponseItem[]> {
    const client = this.getClient();
    const options = client.apps.listInstallations.endpoint.merge({});
    try {
      return await client.paginate(options) as Octokit.AppsListInstallationsResponseItem[];
    } catch (err) {
      log.error("An error occurred while fetching the installations. Please check your GitHub App private key.");
      throw err;
    }
  }

  public async createCheckStatus(createParams: Octokit.ChecksCreateParams): Promise<Octokit.Response<Octokit.ChecksCreateResponse>> {
    const client = await this.getGhAppClient(createParams.owner);
    return await client.checks.create(createParams);
  }

  public async getSwingletreeConfigFromRepository(owner: string, repo: string) {
    const client = await this.getGhAppClient(owner);
    const response = await client.repos.getContents({
      owner: owner,
      repo: repo,
      path: ".swingletree.yml"
    });

    if (response.status == 404) {
      return null;
    }

    return yaml.safeLoad(Buffer.from((response.data as any).content, "base64").toString());
  }

  public async getCheckSuitesOfRef(params: Octokit.ChecksListSuitesForRefParams): Promise<Octokit.Response<Octokit.ChecksListSuitesForRefResponse>> {
    try {
      const client = await this.getGhAppClient(params.owner);
      return await client.checks.listSuitesForRef(params);
    } catch (err) {
      log.debug("could not retrieve check suites for ref %s/%s@%s", params.owner, params.repo, params.ref);
      throw err;
    }
  }

  public async isOrganizationKnown(login: string): Promise<boolean> {
    return await this.installationStorage.getInstallationId(login) != null;
  }

  private getClient(): Octokit {
    console.log(this.key);
    const ghClient = new Octokit({
      baseUrl: this.baseUrl,
      authStrategy: createAppAuth,
      auth: {
        id: this.appId,
        privateKey: this.key
      },
      log: this.clientLogConfig
    });

    return ghClient;
  }

  private async retrieveInstallationId(login: string): Promise<number> {
    let installationId: number;

    try {
      log.debug("try to retrieve installation id from storage..");
      installationId = await this.installationStorage.getInstallationId(login);

      if (installationId == null) {
        throw new Error(`Swingletree seems not to be installed on repository ${login}`);
      }

      return installationId;
    } catch (err) {
      log.warn("failed to retrieve installation id", err);
      throw err;
    }
  }

  private async retrieveBearerToken(login: string): Promise<string> {
    try {
      log.debug("looking up bearer token from cache..");
      let bearerToken = await this.tokenStorage.getToken(login);

      // on cache miss
      if (bearerToken == null) {
        log.info("bearer for %s seems to have reached ttl. requesting new bearer.", login);
        try {
          const bearerClient = this.getClient();
          const bearerRequest = await bearerClient.apps.createInstallationToken({
            installation_id: await this.retrieveInstallationId(login)
          });

          // cache token
          this.tokenStorage.store(login, bearerRequest.data);

          // extract token
          bearerToken = bearerRequest.data.token;
        } catch (err) {
          throw new Error("failed to request new bearer token. " + err);
        }
      }

      return bearerToken;
    } catch (err) {
      log.warn("an error occurred while trying to retrieve the bearer token.", err);
      throw err;
    }
  }

  private async getGhAppClient(login: string): Promise<Octokit> {
    const bearerToken = await this.retrieveBearerToken(login);

    return new Promise<any>((resolve) => {
      resolve(
        new Octokit({
          baseUrl: this.baseUrl,
          auth: `token ${bearerToken}`,
          log: this.clientLogConfig
        })
      );
    });
  }
}



export default GithubClientService;