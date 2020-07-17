"use strict";

import { log, Harness } from "@swingletree-oss/harness";
import GithubClientService from "./client/github-client";
import { injectable, inject } from "inversify";
import { Octokit } from "@octokit/rest";
import { CommitStatusSender } from "../status-sender";
import { ProviderClient } from "../provider-client";


/** Sends Commit Status Requests to GitHub
 */
@injectable()
class GithubCommitStatusSender extends CommitStatusSender {

  private githubClientService: GithubClientService;

  constructor(
    @inject(ProviderClient) githubClientService: GithubClientService
  ) {
    super();
    this.githubClientService = githubClientService;
  }

  private convertToConclusion(conclusion: Harness.Conclusion): "success" | "action_required" | "neutral" | "failure" {
    let result: "success" | "action_required" | "neutral" | "failure" = "neutral";

    switch (conclusion) {
      case Harness.Conclusion.PASSED: result = "success"; break;
      case Harness.Conclusion.BLOCKED: result = "action_required"; break;
      case Harness.Conclusion.UNDECISIVE: result = "neutral"; break;
      case Harness.Conclusion.ANALYSIS_FAILURE: result = "failure"; break;
    }

    return result;
  }

  private convertSwingletreeSeverity(severity: Harness.Severity): "notice" | "warning" | "failure" {
    let result: "notice" | "warning" | "failure" = "notice";

    switch (severity) {
      case Harness.Severity.BLOCKER: result = "failure"; break;
      case Harness.Severity.MAJOR:
      case Harness.Severity.WARNING: result = "warning"; break;
      case Harness.Severity.INFO: result = "notice"; break;
    }

    return result;
  }

  private convertToCheckAnnotations(annotations: Harness.Annotation[]): Octokit.ChecksCreateParamsOutputAnnotations[] {
    const converted = annotations.filter(i => i.type == Harness.AnnotationType.FILE)
      .map(annotation => {
        const item = annotation as Harness.FileAnnotation;
        return {
          path: item.path,
          start_line: item.start || 1,
          end_line: item.end || 1,
          title: item.title,
          message: item.detail,
          annotation_level: this.convertSwingletreeSeverity(item.severity)
        } as Octokit.ChecksCreateParamsOutputAnnotations;
      });

    if (converted.length == 0) {
      return undefined;
    }

    return converted;
  }

  public async sendAnalysisStatus(report: Harness.AnalysisReport) {

    if ((report.source as Harness.ScmSource).type != Harness.ScmType.GITHUB) {
      log.debug("skipping GitHub notification. This event is not targeting a github repository");
      return;
    }

    const githubSource = report.source as Harness.GithubSource;

    try {
      if (!(await this.githubClientService.isOrganizationKnown(githubSource.owner))) {
        log.debug("ignoring webhook event for unknown organization %s.", githubSource.owner);
        return;
      }
    } catch (err) {
      log.error("failed to look up organization %s in installation cache", githubSource.owner);
      return;
    }

    const checkCreateParams: Octokit.ChecksCreateParams = {
      head_sha: githubSource.sha,
      owner: githubSource.owner,
      repo: githubSource.repo,
      details_url: report.link,
      name: report.sender,
      output: {
        title: report.title,
        summary: report.markdown || report.shortMessage || ""
      }
    };

    if (report.checkStatus) {
      checkCreateParams.conclusion = this.convertToConclusion(report.checkStatus);
      checkCreateParams.status = "completed";
    }

    if (report.annotations) {
      if (report.annotations.length >= 50) {
        // this is a GitHub api constraint. Annotations are limited to 50 items max.
        log.debug("%s issues were retrieved. Limiting reported results to 50.", report.annotations.length);

        // capping to 50 items
        report.annotations = report.annotations.slice(0, 50);
      } else {
        log.debug("annotating %s issues to check result", report.annotations.length);
      }

      checkCreateParams.output.annotations = this.convertToCheckAnnotations(report.annotations);
    }

    log.debug("Check create parameters:\n%j", checkCreateParams);

    // send check run status to GitHub
    this.githubClientService
      .createCheckStatus(checkCreateParams)
      .then(() => {
        log.info("check status update (%s) for %s/%s@%s was sent to github", checkCreateParams.conclusion, githubSource.owner, githubSource.repo, githubSource.sha);
      })
      .catch((error: any) => {
        log.error("could not persist check status for %s with commit id %s\nerror: %j\nrequest: %j", githubSource.repo, githubSource.sha, error, checkCreateParams);
      });

    return checkCreateParams;
  }
}

export default GithubCommitStatusSender;