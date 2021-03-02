import erc20 from '../abi/erc20.json'
import masterchefABI from '../abi/masterchef.json'
import { getAddress } from '../utils/cakeAddressHelpers'
import cakeFarmsConfig from '../config/cakefarms'
import apeFarmsConfig from '../config/apefarms'
import cakeaddresses from '../config/cakecontracts'
import apeaddresses from '../config/apecontracts'

import {Contract, Provider} from "ethers-multicall";

// the lpTokenRatio doesn't get calculated (always zero) if we use this bignumber
// import { BigNumber } from "@ethersproject/bignumber";


// using this bignumber cause the @ethers/bignumber causes the lpTokenRatio = 0
import BigNumber from 'bignumber.js'


// taken from pancake source

const fetchFarms = async (providers) => {
   const bscProvider = providers.bsc;
   const ethProvider = providers.eth;

   const callProvider = new Provider(bscProvider);
   await callProvider.init();

   for (let cakeFarm of cakeFarmsConfig) {
      cakeFarm.mcAddress = cakeaddresses.masterChef[bscProvider.network.chainId];
   }

   for (let apeFarm of apeFarmsConfig) {
      apeFarm.mcAddress = apeaddresses.masterApe[bscProvider.network.chainId];
   }

   var allFarmsConfig = cakeFarmsConfig.concat(apeFarmsConfig);

   const farms = await Promise.all(
      allFarmsConfig.map(async farmConfig => {
         const lpAddress = getAddress(farmConfig.lpAddresses, bscProvider);

         // balance of LP contract
         const tokenContract = new Contract(getAddress(farmConfig.tokenAddresses, bscProvider), erc20);
         const tokenBalanceLPCall = tokenContract.balanceOf(getAddress(farmConfig.lpAddresses, bscProvider));

         // Balance of quote token on LP contract
         const quoteTokenContract = new Contract(getAddress(farmConfig.quoteTokenAdresses, bscProvider), erc20);
         const quoteTokenBalanceLPCall = quoteTokenContract.balanceOf(getAddress(farmConfig.lpAddresses, bscProvider));

         // Balance of LP tokens in the master chef contract
         const lpContract = new Contract(getAddress(farmConfig.lpAddresses, bscProvider), erc20);
         const lpTokenBalanceMCCall = lpContract.balanceOf(farmConfig.mcAddress);

         // total supply of LP tokens
         const lpTotalSupplyCall = lpContract.totalSupply();

         // token decimals
         const tokenDecimalsCall = tokenContract.decimals();

         // quote token decimals
         const quoteTokenDecimalsCall = quoteTokenContract.decimals();

         // these values come in as ethers/bignumber values
         let [
            tokenBalanceLP,
            quoteTokenBalanceLP,
            lpTokenBalanceMC,
            lpTotalSupply,
            tokenDecimals,
            quoteTokenDecimals] = await callProvider.all([
            tokenBalanceLPCall,
            quoteTokenBalanceLPCall,
            lpTokenBalanceMCCall,
            lpTotalSupplyCall,
            tokenDecimalsCall,
            quoteTokenDecimalsCall]);

         // console.log(`tokenBalanceLP: ${tokenBalanceLP}, quoteTokenBalanceLP: ${quoteTokenBalanceLP}, lpTokenBalanceMC: ${lpTokenBalanceMC.toString()}, lpTotalSupply: ${lpTotalSupply.toString()}, tokenDecimals: ${tokenDecimals}, quoteTokenDecimals: ${quoteTokenDecimals}`);

         // convert to regular bignumber values
         tokenBalanceLP = BigNumber(tokenBalanceLP.toString());
         quoteTokenBalanceLP = BigNumber(quoteTokenBalanceLP.toString());
         lpTokenBalanceMC = BigNumber(lpTokenBalanceMC.toString());
         lpTotalSupply = BigNumber(lpTotalSupply.toString());
         tokenDecimals = BigNumber(tokenDecimals.toString());
         quoteTokenDecimals = BigNumber(quoteTokenDecimals.toString());


         // Ratio in % a LP tokens that are in staking, vs the total number in circulation
         const lpTokenRatio = lpTokenBalanceMC.div(lpTotalSupply);

         // console.log("lpTokenBalanceMC: ", lpTokenBalanceMC.toString(), " lpTotalSupply: ", lpTotalSupply.toString(), " lpTokenRatio: ", lpTokenRatio.toString());

         // Total value in staking in quote token value
         const lpTotalInQuoteToken = quoteTokenBalanceLP
            .div(BigNumber(10).pow(18))
            .times(BigNumber(2))
            .times(lpTokenRatio);

         // console.log("quoteTokenBalanceLP: ", quoteTokenBalanceLP.toString(), " quoteTokenDecimals: ", quoteTokenDecimals.toString(), "lpTokenRatio: ", lpTokenRatio.toString());

         // Amount of token in the LP that are considered staking (i.e amount of token * lp ratio)
         const tokenAmount = tokenBalanceLP.div(BigNumber(10).pow(tokenDecimals)).times(lpTokenRatio);
         const quoteTokenAmount = quoteTokenBalanceLP
            .div(BigNumber(10)
               .pow(quoteTokenDecimals))
            .times(lpTokenRatio);

         // console.log("token amount: ", tokenAmount, " quoteTokenAmount: ", quoteTokenAmount);

         const masterChefContract = new Contract(farmConfig.mcAddress, masterchefABI);
         const poolInfoCall = masterChefContract.poolInfo(farmConfig.pid);
         const totalAllocCall = masterChefContract.totalAllocPoint();

         let [info, totalAllocPoint] = await callProvider.all([poolInfoCall, totalAllocCall]);

         // console.log("info >>> ", info, " totalAllocPoint >> ", totalAllocPoint);

         const allocPoint = BigNumber(info.allocPoint._hex);
         const poolWeight = allocPoint.div(BigNumber(totalAllocPoint.toString()));

         // console.log("quoteTokenAmount: ", quoteTokenAmount.toNumber(), " tokenAmount: ", tokenAmount.toNumber());

         return {
            ...farmConfig,
            tokenAmount: tokenAmount.toJSON(),
            quoteTokenAmount: quoteTokenAmount.toJSON(),
            lpTotalInQuoteToken: lpTotalInQuoteToken.toJSON(),
            tokenPriceVsQuote: quoteTokenAmount.div(tokenAmount).toJSON(),
            poolWeight: poolWeight.toJSON(),
            multiplier: `${allocPoint.div(100).toString()}X`,
         };
      }));

   return farms;
}


export default fetchFarms;
