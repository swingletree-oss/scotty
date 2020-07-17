"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import { GithubClientServiceMock } from "../mock-classes";
import { RepoConfigWebservice } from "../../src/routes/config/service";
import { Harness } from "@swingletree-oss/harness";

const sandbox = sinon.createSandbox();

describe("Repository Configuration", () => {
  let uut: RepoConfigWebservice;
  let githubMock: GithubClientServiceMock;
  const testConfig: any = { plugin: { sonar: {}}};

  beforeEach(function () {
    githubMock = new GithubClientServiceMock();
    githubMock.getSwingletreeConfigFromRepository = sinon.stub().resolves(testConfig);
    uut = new RepoConfigWebservice(githubMock);
  });

  afterEach(function () {
    sandbox.restore();
  });


  it("should retrieve configs from cache", async () => {
    await (uut as any).get("test", "testRepo");
    await (uut as any).get("test", "testRepo");
    const value: Harness.RawRepositoryConfig = await (uut as any).get("test", "testRepo");

    sinon.assert.calledOnce(githubMock.getSwingletreeConfigFromRepository as any);
    expect(value).to.be.not.undefined;
    expect(value).to.have.nested.property("plugin.sonar");
  });

});
