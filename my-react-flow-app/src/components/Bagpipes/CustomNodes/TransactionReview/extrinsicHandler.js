import { dotToHydraDx, hydraDxToParachain, polkadot_to_assethub, interlay2assethub, assethub2interlay, assethub_to_polkadot } from "../../../../Chains/DraftTx/DraftxTransferTx";
import { getTokenDecimalsByChainName } from "../../../../Chains/Helpers/AssetHelper";
import toast from "react-hot-toast";

// import { hydradx_omnipool_sell } from "../../../Chains/DraftTx/DraftSwapTx";
import { listChains } from "../../../../Chains/ChainsInfo";
import { account } from "@polkadot/api-derive/balances";

export async function extrinsicHandler(actionType, formData) {
    
    switch(actionType) {
        case 'xTransfer':
            console.log("Inside extrinsicHandler for xTransfer formData:", formData);
            return handlexTransfer(formData);
        case 'swap':
            console.log("Inside extrinsicHandler for swap");
            return handleSwap(formData);
        default:
            throw new Error("Unsupported action type.");
        }
};


function handlexTransfer(formData) {
    console.log("handlexTransfer Handling xTransfer...");
    const chains = listChains();
    const source = formData.source;
    const target = formData.target;
    const delay = formData.source.delay;

    // check if the asset is native or on-chain asset. 
    // Retrieve token decimals for the source chain
    const tokenDecimals = getTokenDecimalsByChainName(source.chain);

    // Adjust the source amount according to the token decimals
    const submittableAmount = source.amount * (10 ** tokenDecimals);

    console.log(`handlexTransfer Source chain: ${source.chain}`);
    console.log(`handlexTransfer Target chain: ${target.chain}`);
    console.log(`handlexTransfer Source amount: ${source.amount}`);
    console.log(`handlexTransfer Target address: ${target.address}`);

    // Define a map for each xTransfer action
    const reserverTransferActions = {
        'polkadot:hydraDx': () => {
            if(delay) {
                const numberValue = Number(delay);
                if (numberValue >= 1){
                    return dotToHydraDx(submittableAmount, target.address, numberValue);
                };
            };
            console.log("handlexTransfer for Polkadot to HydraDx...");
            return dotToHydraDx(submittableAmount, target.address);
        },
        'hydraDx:assetHub': () => {
            console.log("handlexTransfer for HydraDx to AssetHub...");
            const paraid = 1000;
            return hydraDxToParachain(submittableAmount, source.assetId, target.chain, paraid);
        },
        'polkadot:assetHub': () => {
            if(delay) {
                const numberValue = Number(delay);
                if (numberValue >= 1){
                    return polkadot_to_assethub(submittableAmount, target.address, numberValue);
                };
            };
            console.log("handlexTransfer for Polkadot to AssetHub...");
            return polkadot_to_assethub(submittableAmount, target.address);
        },
        'assetHub:polkadot': () => {
            console.log("handlexTransfer for AssetHub to Polkadot...");
            return assethub_to_polkadot(submittableAmount, target.address);
        },
        'hydraDx:polkadot': () => {
            console.log("handlexTransfer for HydraDx to Polkadot...");
            const paraid = 0;
            return hydraDxToParachain(submittableAmount, source.assetId, target.chain, paraid);
        },

        'assetHub:interlay': () => {
            const tetherAmount = submittableAmount / 1000;
            console.log("handlexTransfer forAssetHub to Interlay...", tetherAmount);
            return assethub2interlay(source.assetId, tetherAmount, target.address);
        },
            // not supported
                // 'interlay:assethub': () => {
                //     return interlay2assethub(source.assetId, submittableAmount, target.address);
                //    },

        'assetHub:hydraDx': () => {
            console.log("handlexTransfer forAssetHub to HydraDx...");
            const paraid = 2034;
            return assethub_to_hydra(source.assetId, submittableAmount, target.address);
        }
    };

    const action = reserverTransferActions[`${source.chain}:${target.chain}`];

    if (action) {
        console.log(`action got!`);
        return action();
    } else {
        console.log("Unsupported xTransfer direction.");
        toast("Action data is empty. Did you fetch?");
        
        throw new Error("Unsupported xTransfer direction.");
    }
}


 
function handleSwap(formData) {
    const source = formData.source;
    const target = formData.target;

      // Retrieve token decimals for the source chain
      const tokenDecimals = getTokenDecimalsByChainName(source.chain);

      // Adjust the source amount according to the token decimals
      const submittableAmount = source.amount * (10 ** tokenDecimals);


      // TODO: handle swaps
    if (source.chain === 'hydraDx' && target.chain === 'hydraDx') {
        // hydradx_omnipool_sell hydradx_omnipool_sell(assetin: string, assetout: string, amount: number, minBuyAmount: number)
        return true;
    }
    throw new Error("You can only swap from hydradx to hydradx");
}
