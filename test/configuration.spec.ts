"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
import { ConfigurationService, ScottyConfig } from "../src/configuration";

chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();

describe("ConfigurationService", () => {

  let uut: ConfigurationService;
  let envBackup;

  beforeEach(() => {
    envBackup = Object.assign({}, process.env);
    process.env = {};
  });

  afterEach(() => {
    process.env = envBackup;
  });

  describe("GitHub", () => {

    it("should use default configuration when no env vars are set", () => {
      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(ScottyConfig.Github.BASE)).to.be.equal("http://localhost:10101");
      expect(uut.get(ScottyConfig.Github.WEBHOOK_SECRET)).to.be.equal("do not tell");
      expect(uut.getNumber(ScottyConfig.Github.APPID)).to.be.equal(101);
      expect(uut.get(ScottyConfig.Github.KEYFILE)).to.be.equal("test/app-key.test");
      expect(uut.getBoolean(ScottyConfig.Github.CLIENT_DEBUG)).to.be.false;
    });

    it("should prioritize environment variables", () => {
      process.env["SCOTTY_GITHUB_BASE"] = "envBase";
      process.env["SCOTTY_GITHUB_SECRET"] = "envSecret";
      process.env["SCOTTY_GITHUB_APP_ID"] = "1337";
      process.env["SCOTTY_GITHUB_APP_KEYFILE"] = "some other key file";
      process.env["SCOTTY_GITHUB_DEBUG"] = "true";

      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(ScottyConfig.Github.BASE)).to.be.equal("envBase");
      expect(uut.get(ScottyConfig.Github.WEBHOOK_SECRET)).to.be.equal("envSecret");
      expect(uut.getNumber(ScottyConfig.Github.APPID)).to.be.equal(1337);
      expect(uut.get(ScottyConfig.Github.KEYFILE)).to.be.equal("some other key file");
      expect(uut.getBoolean(ScottyConfig.Github.CLIENT_DEBUG)).to.be.true;
    });
  });

  describe("Storage", () => {

    it("should use default configuration when no env vars are set", () => {
      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(ScottyConfig.Storage.DATABASE)).to.be.equal("http://localhost");
      expect(uut.get(ScottyConfig.Storage.PASSWORD)).to.be.equal("somepassword");
    });

    it("should prioritize environment variables", () => {
      process.env["SCOTTY_STORAGE_HOST"] = "envHost";
      process.env["SCOTTY_STORAGE_PASSWORD"] = "envPassword";

      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(ScottyConfig.Storage.DATABASE)).to.be.equal("envHost");
      expect(uut.get(ScottyConfig.Storage.PASSWORD)).to.be.equal("envPassword");
    });
  });

});
