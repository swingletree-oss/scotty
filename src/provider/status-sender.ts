import { injectable } from "inversify";
import { Harness } from "@swingletree-oss/harness";

@injectable()
export abstract class CommitStatusSender {
  public abstract async sendAnalysisStatus(report: Harness.AnalysisReport): Promise<any>;
}