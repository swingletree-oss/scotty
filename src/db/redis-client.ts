import { RedisClient } from "redis";
import { ConfigurationService, ScottyConfig } from "../configuration";
import { inject } from "inversify";
import { injectable } from "inversify";
import { log } from "@swingletree-oss/harness";
import EventBus from "../event/event-bus";
import { DatabaseReconnectEvent } from "../event/event-model";

@injectable()
class RedisClientFactory {
  private eventBus: EventBus;

  private registeredClients: RedisClient[];
  private database: string;
  private password: string;

  constructor(
    @inject(ConfigurationService) configService: ConfigurationService,
    @inject(EventBus) eventBus: EventBus
  ) {
    this.registeredClients = [];

    this.eventBus = eventBus;

    this.database = configService.get(ScottyConfig.Storage.DATABASE);
    this.password = configService.get(ScottyConfig.Storage.PASSWORD);

    if (!this.password) {
      log.warn("Redis client is configured to use no authentication. Please consider securing the database.");
    }
  }

  public createClient(databaseIndex = 0): RedisClient {
    const client = new RedisClient({
      host: this.database,
      password: (this.password) ? this.password : undefined,
      retry_strategy: (options) => {
        return 5000;
      }
    });

    client.on("error", function (err) {
      if (err.code == "ECONNREFUSED") {
        log.error("Redis client for index %i has trouble connecting to the database: %s", databaseIndex, err.message);
      } else {
        log.error("database error for index %i! %s", databaseIndex, err.message);
      }
    });

    client.on("ready", () => {
      log.debug("Redis client for database index %i is connected and ready.", databaseIndex);
      this.eventBus.emit(new DatabaseReconnectEvent(databaseIndex));
    });

    client.select(databaseIndex);

    this.registeredClients.push(client);

    return client;
  }
}

export enum DATABASE_INDEX {
  EVENT_CONFIG_CACHE = 3,
  TOKEN_STORAGE = 2,
  INSTALLATION_STORAGE = 1
}

export default RedisClientFactory;