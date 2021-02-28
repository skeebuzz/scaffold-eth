import React, { useState } from "react";
import { formatEther } from "@ethersproject/units";
import { useTokenBalance } from "eth-hooks";
import {store, useGlobalState} from 'state-pool';

export default function TokenBalance(props) {
   const useDollars = props.usd ? true : false;
  const [dollarMode, setDollarMode] = useState(useDollars);

   const [contracts, , ] = useGlobalState("contracts");
   const [coinPrices, , ] = useGlobalState("coinPrices");

   const networkName = props.provider.network.name;

  // const tokenContract = props.contracts && props.contracts[props.provider.name][props.token];
  const tokenContract = contracts[networkName].tokens[props.token]
  const balance = useTokenBalance(tokenContract, props.address, 1777);

  let floatBalance = parseFloat("0.00");

  let usingBalance = balance;

  if (typeof props.balance !== "undefined") {
    usingBalance = props.balance;
  }

  if (usingBalance) {
    const etherBalance = formatEther(usingBalance);
    parseFloat(etherBalance).toFixed(2);
    floatBalance = parseFloat(etherBalance);
  }

  let displayBalance = floatBalance.toFixed(4);

  if (dollarMode && coinPrices.hasPrices && coinPrices[props.token]) {
     // if we have a coingecko quote use it
     displayBalance = "$" + (floatBalance * coinPrices[props.token].usd).toFixed(2);
  } else if (props.dollarMultiplier && dollarMode) {
    displayBalance = "$" + (floatBalance * props.dollarMultiplier).toFixed(2);
  }

  return (
    <span
      style={{
        verticalAlign: "middle",
        fontSize: 24,
        padding: 8,
        cursor: "pointer",
      }}
      onClick={() => {
        setDollarMode(!dollarMode);
      }}
    >
      {props.img} {displayBalance}
    </span>
  );
}
