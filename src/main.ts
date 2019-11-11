import container from "./ioc-config";

import EventBus from "./event/event-bus";
import InstallationStorage from "./github/client/installation-storage";
import { WebServer } from "./webserver";
import { HistoryService, ElasticHistoryService, NoopHistoryService } from "./elastic/persister";
import { ConfigurationService, ScottyConfig } from "./configuration";
import { log } from "@swingletree-oss/harness";
import { CacheSyncEvent } from "./event/event-model";
import { InstallationWebservice } from "./routes/installations";
import { ReportWebservice } from "./routes/report";
import { GithubRepoConfigWebservice } from "./routes/config/github";
import GhAppInstallationHandler from "./github/app-installation-handler";

class Scotty {
  private webserver: WebServer;
  private eventBus: EventBus;

  constructor() {
    log.info("Starting up...");

    const configService = container.get<ConfigurationService>(ConfigurationService);
    if (configService.getBoolean(ScottyConfig.Elastic.ENABLED)) {
      log.info("Registering Elastic Storage Service");
      container.bind<HistoryService>(HistoryService).to(ElasticHistoryService).inSingletonScope();
    } else {
      log.info("Elastic is disabled. Will not write any Notification Events to Elastic.");
      container.bind<HistoryService>(HistoryService).to(NoopHistoryService).inSingletonScope();
    }

    // strap installation handler
    container.get<GhAppInstallationHandler>(GhAppInstallationHandler);

    this.webserver = container.get<WebServer>(WebServer);
    this.eventBus = container.get<EventBus>(EventBus);

    // strap installation service
    this.webserver.addRouter("/installation", container.get<InstallationWebservice>(InstallationWebservice).getRouter());

    // strap report service
    this.webserver.addRouter("/report", container.get<ReportWebservice>(ReportWebservice).getRouter());

    // strap repository config webservices
    this.webserver.addRouter("/config/github/", container.get<GithubRepoConfigWebservice>(GithubRepoConfigWebservice).getRouter());

    // bootstrap periodic events
    setInterval(() => { this.eventBus.emit(new CacheSyncEvent()); }, InstallationStorage.SYNC_INTERVAL);
  }

  public isEnabled(): boolean {
    return true;
  }
}

new Scotty();
