"use strict";

import { log, Harness } from "@swingletree-oss/harness";
import { injectable, inject } from "inversify";
import { GiteaClient, StatusState, CreateCommitStatusRequest } from "./client";
import { CommitStatusSender } from "../status-sender";
import { ScottyConfig, ConfigurationService } from "../../configuration";
import { ProviderClient } from "../provider-client";


/** Sends Commit Status Requests to GitHub
 */
@injectable()
class GiteaCommitStatusSender extends CommitStatusSender {

  private giteaClient: GiteaClient;
  private overviewEnabled: boolean;
  private deckBaseUrl: string;

  constructor(
    @inject(ConfigurationService) config: ConfigurationService,
    @inject(ProviderClient) giteaClient: GiteaClient
  ) {
    super();
    this.giteaClient = giteaClient;

    this.overviewEnabled = config.getBoolean(ScottyConfig.Elastic.ENABLED);
    this.deckBaseUrl = config.get("deck:baseurl");
  }

  private convertToConclusion(conclusion: Harness.Conclusion): StatusState {
    let result: StatusState = StatusState.PENDING;

    switch (conclusion) {
      case Harness.Conclusion.PASSED: result = StatusState.SUCCESS; break;
      case Harness.Conclusion.BLOCKED: result = StatusState.ERROR; break;
      case Harness.Conclusion.UNDECISIVE: result = StatusState.WARNING; break;
      case Harness.Conclusion.ANALYSIS_FAILURE: result = StatusState.FAILURE; break;
    }

    return result;
  }

  public async sendAnalysisStatus(report: Harness.AnalysisReport): Promise<CreateCommitStatusRequest> {

    const giteaSource = report.source as Harness.GithubSource;

    const statusCreateParams: CreateCommitStatusRequest = {
      target_url: report.link,
      context: report.sender,
      description: report.title,
      state: this.convertToConclusion(report.checkStatus)
    };

    if (!report.link && this.overviewEnabled && this.deckBaseUrl) {
      statusCreateParams.target_url = `${this.deckBaseUrl}/builds/${giteaSource.owner}/${giteaSource.repo}/${giteaSource.sha}`;
      log.debug("setting target_url to %s", statusCreateParams.target_url);
    }

    // send check run status
    this.giteaClient.sendCommitStatus(
      giteaSource,
      statusCreateParams
    ).catch(err => {
      log.error("failed to persist status.\n%j", err);
    });

    return statusCreateParams;
  }
}

export default GiteaCommitStatusSender;