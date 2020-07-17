"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";

chai.use(require("sinon-chai"));

import GhAppInstallationHandler from "../../src/provider/github/app-installation-handler";
import { AppInstalledEvent, EventType } from "../../src/event/event-model";

const sandbox = sinon.createSandbox();

describe("App installation handler", () => {
  let uut: GhAppInstallationHandler;

  let eventBusMock: any;
  let installationStorage: any;
  let githubClientMock: any;

  beforeEach(function () {

    eventBusMock = {
      register: sinon.stub()
    };

    installationStorage = {
      store: sinon.stub()
    };

    githubClientMock = {
      getInstallations: sinon.stub().resolves([
        {
          account: { login: "test" },
          id: "testId"
        }
      ])
    };

    uut = new GhAppInstallationHandler(
      eventBusMock,
      installationStorage,
      githubClientMock
    );
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("should register on installation event", () => {
    sinon.assert.calledWith(eventBusMock.register, EventType.AppInstalledEvent);
  });

  it("should store installation metadata", () => {
    const data = {
      account: {
        login: "login"
      },
      app_id: 321,
      id: 123
    };

    uut.appInstalled({
      account: "login",
      accountId: 1000,
      installationId: 123
    } as AppInstalledEvent);

    sinon.assert.calledWith(installationStorage.store, "login", 123);
  });

});