"use strict";

import { log, Events } from "@swingletree-oss/harness";

import { injectable, inject } from "inversify";
import EventBus from "../../event/event-bus";
import InstallationStorage from "./client/installation-storage";
import GithubClientService from "./client/github-client";
import { Octokit } from "@octokit/rest";
import { DATABASE_INDEX } from "../../db/redis-client";
import { EventType, AppInstalledEvent, DatabaseReconnectEvent } from "../../event/event-model";


/** Handles GitHub-App installation notices sent by GitHub
 */
@injectable()
class GhAppInstallationHandler {
  private clientService: GithubClientService;
  private installationStorage: InstallationStorage;
  private eventBus: EventBus;

  constructor(
    @inject(EventBus) eventBus: EventBus,
    @inject(InstallationStorage) installationStorage: InstallationStorage,
    @inject(GithubClientService) clientService: GithubClientService
  ) {
    this.installationStorage = installationStorage;
    this.eventBus = eventBus;
    this.clientService = clientService;

    this.eventBus.register(EventType.AppInstalledEvent, this.appInstalled, this);
    this.eventBus.register(EventType.DatabaseReconnect, this.syncAppInstallationsOnReconnect, this);
    this.eventBus.register(EventType.CacheSyncEvent, this.syncAppInstallations, this);
  }

  public appInstalled(event: AppInstalledEvent) {
    this.installationStorage.store(event.account, event.installationId);
    log.info("new installation for login %s was registered", event.account);
  }

  public async syncAppInstallationsOnReconnect(event: DatabaseReconnectEvent) {
    if (event.databaseIndex == DATABASE_INDEX.INSTALLATION_STORAGE) {
      log.debug("performing synchronize check after database connection loss..");
      this.syncAppInstallations();
    }
  }

  private async syncAppInstallations() {
    if (await this.installationStorage.isSyncRequired()) {
      log.info("synchronizing installation cache...");
      this.installationStorage.setSyncFlag();

      try {
        const installations: Octokit.AppsListInstallationsResponseItem[] = await this.clientService.getInstallations();
        log.debug("retrieved %s installations", installations.length);

        installations.forEach((installation: Octokit.AppsListInstallationsResponseItem) => {
          this.installationStorage.store(installation.account.login, installation.id);
        });
        log.info("installation cache sync complete.");
      } catch (err) {
        log.warn("could not update installation cache: %s", err);
        this.installationStorage.removeSyncFlag();
      }
    } else {
      log.debug("cache seems to be fresh. Skipping sync.");
    }
  }
}

export default GhAppInstallationHandler;