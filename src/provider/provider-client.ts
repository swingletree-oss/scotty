import { injectable } from "inversify";

@injectable()
export abstract class ProviderClient {
  public abstract async getSwingletreeConfigFromRepository(owner: string, repo: string): Promise<any>;
}