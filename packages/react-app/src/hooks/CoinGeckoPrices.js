import {useState} from "react";
import { usePoller } from "eth-hooks";

export default function useCoinGeckoPrices(coinGeckoClient, pollTime) {
   const [coinPrices, setCoinPrices] = useState({});

   const pollPrices = () => {

      async function getPrices() {
         console.log("polling coingecko prices...");

         let prices = await coinGeckoClient.simple.price({"vs_currencies": "usd", "ids": ["binance-eth", "binance-btc", "binancecoin"]});
         if (prices.success) {
            console.log("coingecko prices: ", prices.data);
            setCoinPrices(prices.data);
         } else {
            console.log("problem getting coingecko prices: ", prices.message);
         }
      }
      getPrices();
   };
   usePoller(pollPrices, pollTime || 15000);

   return coinPrices;
}
