import container from "./ioc-config";

import EventBus from "./event/event-bus";
import InstallationStorage from "./provider/github/client/installation-storage";
import { WebServer } from "./webserver";
import { HistoryService, ElasticHistoryService, NoopHistoryService } from "./elastic/persister";
import { ConfigurationService, ScottyConfig } from "./configuration";
import { log } from "@swingletree-oss/harness";
import { CacheSyncEvent } from "./event/event-model";
import { InstallationWebservice } from "./routes/installations";
import { ReportWebservice } from "./routes/report";
import GhAppInstallationHandler from "./provider/github/app-installation-handler";
import { CommitStatusSender } from "./provider/status-sender";
import GithubCommitStatusSender from "./provider/github/commit-status-sender";
import GiteaCommitStatusSender from "./provider/gitea/commit-status-sender";
import GithubClientService from "./provider/github/client/github-client";
import TokenStorage from "./provider/github/client/token-storage";
import { GiteaClient } from "./provider/gitea/client";
import { ProviderClient } from "./provider/provider-client";
import { RepoConfigWebservice } from "./routes/config/service";

require("source-map-support").install();

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

    this.webserver = container.get<WebServer>(WebServer);
    this.eventBus = container.get<EventBus>(EventBus);

    // configure SCM provider
    const provider = configService.get(ScottyConfig.PROVIDER);
    switch (provider) {
      case "gitea":
        log.info("SCM provider set to Gitea");
        container.bind<ProviderClient>(ProviderClient).to(GiteaClient).inSingletonScope();
        container.bind<CommitStatusSender>(CommitStatusSender).to(GiteaCommitStatusSender).inSingletonScope();
        break;

      default:
        log.info("no SCM provider specified. Using default setting:");
      case "github":
        log.info("SCM provider set to GitHub");
        container.bind<ProviderClient>(ProviderClient).to(GithubClientService).inSingletonScope();
        container.bind<GhAppInstallationHandler>(GhAppInstallationHandler).toSelf().inSingletonScope();
        container.bind<TokenStorage>(TokenStorage).toSelf().inSingletonScope();
        container.bind<InstallationStorage>(InstallationStorage).toSelf().inSingletonScope();
        container.bind<CommitStatusSender>(CommitStatusSender).to(GithubCommitStatusSender).inSingletonScope();

        // strap installation handler
        container.get<GhAppInstallationHandler>(GhAppInstallationHandler);

        // strap installation service
        this.webserver.addRouter("/installation", container.get<InstallationWebservice>(InstallationWebservice).getRouter());

        break;
    }

    // strap report service
    this.webserver.addRouter("/report", container.get<ReportWebservice>(ReportWebservice).getRouter());

    // strap repository config webservices
    this.webserver.addRouter("/config/", container.get<RepoConfigWebservice>(RepoConfigWebservice).getRouter());

    // bootstrap periodic events
    setInterval(() => { this.eventBus.emit(new CacheSyncEvent()); }, InstallationStorage.SYNC_INTERVAL);
  }

  public isEnabled(): boolean {
    return true;
  }
}

new Scotty();
