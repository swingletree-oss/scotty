import { Events, Harness } from "@swingletree-oss/harness";
import { DATABASE_INDEX } from "../db/redis-client";
import { GitHubInstallationReference } from "../github/client/model";

/** Contains event identifiers.
 */
export enum EventType {
  GithubCheckStatusUpdatedEvent = "core:github:checkrun:updated",
  NotificationEvent = "core:notify",
  AppInstalledEvent = "core:github:app-installed",
  AppDeinstalledEvent = "core:github:app-deinstalled",
  DatabaseReconnect = "core:database:reconnect",
  HealthCheckEvent = "core:healthcheck",
  HealthStatusEvent = "core:healthcheck:status",
  CacheSyncEvent = "core:cachesync",
  GitHubCheckSuiteRequestedEvent = "core:checksuite:requested",
  EventAugmentionEvent = "core:cache:event:augment"
}

/** App installed event.
 *
 * This event is fired when a GitHub organization installed Swingletree.
 *
 */
export class AppInstalledEvent extends Events.CoreEvent {
  account: string;
  accountId: number;
  installationId: number;

  constructor(installRef: GitHubInstallationReference) {
    super(EventType.AppInstalledEvent);

    this.account = installRef.account;
    this.accountId = installRef.accountId;
    this.installationId = installRef.installationId;
  }
}

/** App deinstalled event.
 *
 * This event is fired when a GitHub organization UNinstalled Swingletree.
 */
export class AppDeinstalledEvent extends AppInstalledEvent {
  constructor(installRef: GitHubInstallationReference) {
    super(installRef);

    this.eventType = EventType.AppDeinstalledEvent;
  }
}

/** Fired, when the Database client reconnects
 */
export class DatabaseReconnectEvent extends Events.CoreEvent {
  databaseIndex: DATABASE_INDEX;

  constructor(databaseIndex: DATABASE_INDEX) {
    super(EventType.DatabaseReconnect);

    this.databaseIndex = databaseIndex;
  }
}

/** Fired, when a cache refresh is scheduled or neccessary
 */
export class CacheSyncEvent extends Events.CoreEvent {
  constructor() {
    super(EventType.CacheSyncEvent);
  }
}
