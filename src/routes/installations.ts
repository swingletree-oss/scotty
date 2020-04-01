import { injectable, inject } from "inversify";
import EventBus from "../event/event-bus";
import { ConfigurationService } from "../configuration";
import InstallationStorage from "../github/client/installation-storage";
import { Router, Request, Response } from "express";
import { log, Comms } from "@swingletree-oss/harness";
import { AppInstalledEvent, AppDeinstalledEvent } from "../event/event-model";
import { GitHubInstallationReference } from "../github/client/model";

@injectable()
export class InstallationWebservice {
  private eventBus: EventBus;
  private configurationService: ConfigurationService;
  private installationStorage: InstallationStorage;


  constructor(
    @inject(EventBus) eventBus: EventBus,
    @inject(ConfigurationService) configurationService: ConfigurationService,
    @inject(InstallationStorage) installationStorage: InstallationStorage
  ) {

    this.eventBus = eventBus;
    this.configurationService = configurationService;
    this.installationStorage = installationStorage;
  }

  public getRouter(): Router {
    const router = Router();

    router.post("/", this.handleInstallation.bind(this));
    router.delete("/", this.handleInstallDeletion.bind(this));

//    router.get("/installation/:org");
//    router.get("/installation/:org/:repo");

    return router;
  }

  public handleInstallation(req: Request, res: Response) {
    log.debug("received installation request");

    const installation: GitHubInstallationReference = req.body;
    if (!(installation.account && installation.accountId && installation.installationId)) {
      log.debug("malformed installation body");
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new Comms.BadRequestError("malformed installation event body")
        )
      );
      return;
    }

    try {
      this.eventBus.emit(
        new AppInstalledEvent(
          installation
        )
      );
    } catch (err) {
      log.error("failed to emit installation event through event bus", err);
      res.status(422).send(
        (new Comms.Message.ErrorMessage())
          .add(new InstallationFailureError("Failed to install App"))
          .add(new Comms.EventBusFailure(err))
      );
      return;
    }

    res.status(202).send(new Comms.Message.EmptyMessage());
  }

  public handleInstallDeletion(req: Request, res: Response) {
    log.debug("uninstalling ");
    const installation: GitHubInstallationReference = req.body;

    if (!(installation.account && installation.accountId && installation.installationId)) {
      log.warn("could not process installation request due to missing data");
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new Comms.BadRequestError("missing installation data in request.")
        )
      );
    }

    try {
      this.eventBus.emit(
        new AppDeinstalledEvent(
          installation
        )
      );
    } catch (err) {
      log.error("failed to emit deinstallation event through event bus", err);
      res.status(422).send(
        (new Comms.Message.ErrorMessage())
          .add(new InstallationFailureError("Failed to install App"))
          .add(new Comms.EventBusFailure(err))
      );
      return;
    }

    res.status(202).send(new Comms.Message.EmptyMessage());
  }
}

class InstallationFailureError extends Comms.Error {
  constructor(detail: string) {
    super(
      "Installation Failed",
      detail
    );
  }
}