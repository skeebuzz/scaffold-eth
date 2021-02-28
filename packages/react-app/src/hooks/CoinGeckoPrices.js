import {useState} from "react";
import { usePoller } from "eth-hooks";

const coinPriceIds = ["binance-eth", "binance-bitcoin", "binancecoin", "antimatter", "pancakeswap-token"];

export default function useCoinGeckoPrices(coinGeckoClient, pollTime) {
   const [coinPrices, setCoinPrices] = useState({hasPrices: false});

   const pollPrices = () => {

      async function getPrices() {
         let prices = await coinGeckoClient.simple.price({"vs_currencies": "usd", "ids": coinPriceIds});
         if (prices.success) {
            // console.log("setting coingecko coin prices: ", prices.data);
            prices.data.hasPrices = true;
            setCoinPrices(prices.data);
         } else {
            setCoinPrices({hasPrices: false});
            console.log("problem getting coingecko prices: ", prices.message);
         }
      }
      getPrices();
   };
   usePoller(pollPrices, pollTime || 30000);

   return coinPrices;
}
