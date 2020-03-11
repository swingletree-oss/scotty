import { Comms, Harness, log } from "@swingletree-oss/harness";
import { Request, Response, Router } from "express";
import { inject, injectable } from "inversify";
import GithubCommitStatusSender from "../github/commit-status-sender";
import { HistoryService } from "../elastic/persister";
import { BadRequestError } from "@swingletree-oss/harness/dist/comms";

@injectable()
export class ReportWebservice {
  private readonly commitStatusSender: GithubCommitStatusSender;
  private readonly historyService: HistoryService;

  constructor(
    @inject(GithubCommitStatusSender) commitStatusSender: GithubCommitStatusSender,
    @inject(HistoryService) historyService: HistoryService
  ) {
    this.commitStatusSender = commitStatusSender;
    this.historyService = historyService;
  }

  public getRouter(): Router {
    const router = Router();

    router.post("/", this.handleReportPost.bind(this));

    return router;
  }

  public async handleReportPost(req: Request, res: Response) {
    log.debug("processing report");
    const message: Comms.Message.BasicMessage<Harness.AnalysisReport> = req.body;
    const report: Harness.AnalysisReport = message.data;

    if (!message.data.source) {
      res.status(422).send(
        (new Comms.Message.ErrorMessage())
          .add(new BadRequestError("missing source information in report"))
      );
      return;
    }

    try {
      const storeReport: Harness.AnalysisReport = Object.assign({}, report);
      delete storeReport.markdown;

      this.historyService.store(storeReport);
    } catch (err) {
      log.warn("failed to persist report to history: %s", err);
    }

    try {
      await this.commitStatusSender.sendAnalysisStatus(report);
    } catch (err) {
      log.error("failed to emit report through event bus: %s", err);
      res.status(422).send(
        (new Comms.Message.ErrorMessage())
          .add(new ReportProcessingError("failed to process report"))
          .add(new Comms.EventBusFailure(err))
      );
      return;
    }

    res.status(202).send(new Comms.Message.EmptyMessage());
  }
}

class ReportProcessingError extends Comms.Error {
  constructor(detail: string) {
    super(
      "Failed processing report",
      detail
    );
  }
}