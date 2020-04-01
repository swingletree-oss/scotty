"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import { InstallationWebservice } from "../../src/routes/installations";
import { AppInstalledEvent, EventType } from "../../src/event/event-model";
import InstallationStorage from "../../src/github/client/installation-storage";
import { InstallationStorageMock } from "../mock-classes";
import { mockReq, mockRes } from "sinon-express-mock";
import { GitHubInstallationReference } from "@swingletree-oss/harness/dist/comms/scotty";

const sandbox = sinon.createSandbox();

describe("GitHub App Installation handling", () => {
  let uut: InstallationWebservice;

  let eventBusMock: any;
  let ghAppInstallWebhookData: any;
  let installationStorage: InstallationStorage;

  let requestMock, responseMock;

  beforeEach(function () {
    eventBusMock = {
      emit: sinon.stub(),
      register: sinon.stub()
    };

    requestMock = mockReq();
    requestMock.headers = {};
    responseMock = mockRes();

    const configurationMock: any = {
      get: sinon.stub().returns({
        context: "test"
      })
    };

    installationStorage = new InstallationStorageMock();

    uut = new InstallationWebservice(eventBusMock, configurationMock, installationStorage);

    ghAppInstallWebhookData = Object.assign({}, require("../mock/gh-install-webhook.json"));
  });

  afterEach(function () {
    sandbox.restore();
  });


  it("should send app installed event", async () => {
    const registrationData: GitHubInstallationReference = {
      account: "abc",
      accountId: 1,
      installationId: 1
    };

    requestMock.body = registrationData;

    uut.handleInstallation(requestMock, responseMock);

    sinon.assert.calledWith(eventBusMock.emit, sinon.match((event: AppInstalledEvent) => {
        return event.getEventType() == EventType.AppInstalledEvent;
      })
    );
  });

});
