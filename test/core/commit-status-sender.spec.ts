"use strict";

import CommitStatusSender from "../../src/github/commit-status-sender";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";

chai.use(require("sinon-chai"));
chai.use(require("chai-as-promised"));

import {  } from "../../src/event/event-model";
import { Harness } from "@swingletree-oss/harness";

const sandbox = sinon.createSandbox();

describe("Commit Status Sender", () => {
  let uut: CommitStatusSender;

  let mockReport: Harness.AnalysisReport;

  let eventBusMock: any;
  let configurationMock: any;
  let githubClientMock: any;
  let githubMockConfig: any;
  let sonarClientMock: any;
  let templateEngineMock: any;

  beforeEach(function () {

    githubMockConfig = {
      pendingCommitStatus: true
    };

    eventBusMock = {
      emit: sinon.stub(),
      register: sinon.stub()
    };

    configurationMock = {
      get: sinon.stub().returns({
        context: "test",
        github: githubMockConfig
      })
    };

    templateEngineMock = {
      template: sinon.stub().returns("mocked template")
    };

    sonarClientMock = {
      getIssues: sinon.stub()
    };

    githubClientMock = {
      createCheckStatus: sinon.stub(),
      isOrganizationKnown: sinon.stub().resolves(true)
    };

    uut = new CommitStatusSender(
      githubClientMock
    );

    const source = new Harness.GithubSource();
    source.owner = "test";
    source.repo = "testRepo";
    source.sha = "sha123";

    mockReport = {
      markdown: "123",
      sender: "testSender",
      source: source,
      title: "test title",
      annotations: []
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("should send commit status on matching event", async () => {
    githubClientMock.createCheckStatus.resolves();

    await uut.sendAnalysisStatus(mockReport);

    sinon.assert.calledOnce(githubClientMock.createCheckStatus);
  });

  it("should not set an empty annotation array in the CheckRun request", async () => {
    githubClientMock.createCheckStatus.resolves();

    const result = await uut.sendAnalysisStatus(mockReport);

    expect(result.output.annotations).to.be.undefined;
  });


  it("should convert swingletree severities", () => {
    const conversionMap = new Map<Harness.Severity, String>();

    conversionMap.set(Harness.Severity.BLOCKER, "failure");
    conversionMap.set(Harness.Severity.MAJOR, "warning");
    conversionMap.set(Harness.Severity.WARNING, "warning");
    conversionMap.set(Harness.Severity.INFO, "notice");

    conversionMap.forEach((value, key) => {
      expect((uut as any).convertSwingletreeSeverity(key)).to.be.equal(value, `${key} should convert to ${value}`);
    });
  });

  it("should convert swingletree conclusions", () => {
    const conversionMap = new Map<Harness.Conclusion, String>();

    conversionMap.set(Harness.Conclusion.ANALYSIS_FAILURE, "failure");
    conversionMap.set(Harness.Conclusion.BLOCKED, "action_required");
    conversionMap.set(Harness.Conclusion.PASSED, "success");
    conversionMap.set(Harness.Conclusion.UNDECISIVE, "neutral");

    conversionMap.forEach((value, key) => {
      expect((uut as any).convertToConclusion(key)).to.be.equal(value, `${key} should convert to ${value}`);
    });
  });

});