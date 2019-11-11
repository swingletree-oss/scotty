import "reflect-metadata";

import { Container } from "inversify";

import { ConfigurationService } from "./configuration";
import CommitStatusSender from "./github/commit-status-sender";
import GithubClientService from "./github/client/github-client";
import EventBus from "./event/event-bus";
import TokenStorage from "./github/client/token-storage";
import InstallationStorage from "./github/client/installation-storage";
import GhAppInstallationHandler from "./github/app-installation-handler";
import RedisClientFactory from "./db/redis-client";
import { WebServer } from "./webserver";
import { InstallationWebservice } from "./routes/installations";
import { ReportWebservice } from "./routes/report";
import { GithubRepoConfigWebservice } from "./routes/config/github";


const container = new Container();

container.bind<CommitStatusSender>(CommitStatusSender).toSelf().inSingletonScope();
container.bind<ConfigurationService>(ConfigurationService).toSelf().inSingletonScope();
container.bind<GithubClientService>(GithubClientService).toSelf().inSingletonScope();
container.bind<EventBus>(EventBus).toSelf().inSingletonScope();
container.bind<TokenStorage>(TokenStorage).toSelf().inSingletonScope();
container.bind<InstallationStorage>(InstallationStorage).toSelf().inSingletonScope();
container.bind<GhAppInstallationHandler>(GhAppInstallationHandler).toSelf().inSingletonScope();
container.bind<RedisClientFactory>(RedisClientFactory).toSelf().inSingletonScope();

container.bind<WebServer>(WebServer).toSelf().inSingletonScope();
container.bind<ReportWebservice>(ReportWebservice).toSelf().inSingletonScope();
container.bind<InstallationWebservice>(InstallationWebservice).toSelf().inSingletonScope();
container.bind<GithubRepoConfigWebservice>(GithubRepoConfigWebservice).toSelf().inSingletonScope();


export default container;