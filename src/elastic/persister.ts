import { Client } from "@elastic/elasticsearch";
import { injectable, inject } from "inversify";
import { ConfigurationService, ScottyConfig } from "../configuration";
import { log, Harness } from "@swingletree-oss/harness";
import * as Crypto from "crypto";

@injectable()
export abstract class HistoryService {
  abstract store(report: Harness.AnalysisReport): void;
}

@injectable()
export class ElasticHistoryService implements HistoryService {
  private readonly client: Client;
  private readonly index: string;

  constructor(
    @inject(ConfigurationService) configService: ConfigurationService,
  ) {
    this.client = new Client({
      node: configService.get(ScottyConfig.Elastic.NODE),
      auth: configService.getObject(ScottyConfig.Elastic.AUTH)
    });

    this.index = configService.get(ScottyConfig.Elastic.INDEX);
  }

  public generateId(report: Harness.AnalysisReport) {
    const hash = Crypto.createHash("sha256");
    const source = report.source as Harness.GithubSource;

    return hash.update(`${report.sender}:${source.owner}:${source.repo}:${source.sha}`).digest("hex");
  }

  public async store(report: Harness.AnalysisReport) {
    log.debug("creating history entry for %s %s", report.sender, report.uuid);

    if (!report.timestamp) {
      report.timestamp = new Date();
    }

    const elasticRequest: ElasticRequest<Harness.AnalysisReport> = {
      id: this.generateId(report),
      index: this.index,
      body: report
    };

    try {
      await this.client.index(elasticRequest);
    } catch (err) {
      log.warn("could not persist entry for %s %s. caused by %s", report.sender, report.uuid, err);
    }
  }
}

@injectable()
export class NoopHistoryService implements HistoryService {
  constructor() {
    log.info("NOOP History Service registered.");
  }

  public store(report: Harness.AnalysisReport) {
    log.debug("skipping History persist (NOOP History Service configured)");
  }
}

interface ElasticRequest<T> {
  id: string;
  index: string;
  body: T;
}