import { Client } from "@elastic/elasticsearch";
import { injectable, inject } from "inversify";
import { ConfigurationService, ScottyConfig } from "../configuration";
import { log, Harness } from "@swingletree-oss/harness";


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

  public async store(report: Harness.AnalysisReport) {
    log.info("creating history entry for %s %s", report.sender, report.uuid);

    if (!report.timestamp) {
      report.timestamp = new Date();
    }

    try {
      await this.client.index({
        index: this.index,
        body: report
      });
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