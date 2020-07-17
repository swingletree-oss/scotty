import { ConfigurationService, ScottyConfig } from "../src/configuration";
import EventBus from "../src/event/event-bus";
import * as sinon from "sinon";
import InstallationStorage from "../src/provider/github/client/installation-storage";
import RedisClientFactory from "../src/db/redis-client";
import TokenStorage from "../src/provider/github/client/token-storage";
import GithubClientService from "../src/provider/github/client/github-client";

export class EventBusMock extends EventBus {
  constructor() {
    super();
    this.emit = sinon.stub();
    this.register = sinon.stub();
  }
}


export class GithubClientServiceMock extends GithubClientService {
  constructor() {
    super(new ConfigurationServiceMock(), new TokenStorageMock(), new InstallationStorageMock);

    this.getSwingletreeConfigFromRepository = sinon.stub().resolves();

    const self: any = this;
    self.retrieveBearerToken = sinon.stub().resolves("testBearer");
  }
}

export class ConfigurationServiceMock extends ConfigurationService {
  constructor() {
    super();
    const configStub = sinon.stub();
    configStub.withArgs(ScottyConfig.Github.KEYFILE).returns("./test/app-key.test");
    configStub.withArgs(ScottyConfig.Github.BASE).returns("http://localhost:10101");
    this.get = configStub;
  }
}

export class RedisClientFactoryMock extends RedisClientFactory {
  constructor() {
    super(new ConfigurationServiceMock(), new EventBusMock());
    this.createClient = sinon.stub();
  }
}

export class InstallationStorageMock extends InstallationStorage {
  constructor() {
    super(new RedisClientFactoryMock());
    this.getInstallationId = sinon.stub().resolves(10);
    this.isSyncRequired = sinon.stub().resolves(false);
    this.removeSyncFlag = sinon.stub();
    this.store = sinon.stub();
  }
}

export class TokenStorageMock extends TokenStorage {
  constructor() {
    super(new RedisClientFactoryMock());

    this.getToken = sinon.stub().resolves(null);
    this.store = sinon.stub();
  }
}

