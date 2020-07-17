import "reflect-metadata";

import { Container } from "inversify";

import { ConfigurationService } from "./configuration";
import EventBus from "./event/event-bus";
import RedisClientFactory from "./db/redis-client";
import { WebServer } from "./webserver";
import { InstallationWebservice } from "./routes/installations";
import { ReportWebservice } from "./routes/report";
import { RepoConfigWebservice } from "./routes/config/service";


const container = new Container();

container.bind<ConfigurationService>(ConfigurationService).toSelf().inSingletonScope();
container.bind<EventBus>(EventBus).toSelf().inSingletonScope();
container.bind<RedisClientFactory>(RedisClientFactory).toSelf().inSingletonScope();

container.bind<WebServer>(WebServer).toSelf().inSingletonScope();
container.bind<ReportWebservice>(ReportWebservice).toSelf().inSingletonScope();
container.bind<InstallationWebservice>(InstallationWebservice).toSelf().inSingletonScope();
container.bind<RepoConfigWebservice>(RepoConfigWebservice).toSelf().inSingletonScope();


export default container;