import { BlockchainApiController } from "@reown/appkit-controllers";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const originalFetchIdentity = BlockchainApiController.fetchIdentity.bind(BlockchainApiController);

BlockchainApiController.fetchIdentity = async ({ address }) => {
  if (typeof address !== "string" || !EVM_ADDRESS.test(address)) {
    return { name: null, avatar: null };
  }
  return originalFetchIdentity({ address });
};
