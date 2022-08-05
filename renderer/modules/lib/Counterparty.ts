import { CounterpartyClient } from 'counterparty-node-client';

export class Counterparty extends CounterpartyClient {
  constructor() {
    super('http://api.counterparty.io:4000/api/', 'rpc', 'rpc');
  }

  getDispenserByAddresses = async (addresses: string[]) => {
    try {
      const dispensers = await this.getDispensers({
        filters: [{ field: 'source', op: 'IN', value: addresses }],
        order_by: 'satoshirate',
        order_dir: 'asc',
      });
      return dispensers;
    } catch (e) {
      console.error(e);
    }
  };
}
