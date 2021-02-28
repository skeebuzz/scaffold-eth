import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import {  JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import "./App.css";
import { Row, Col, Button, Menu, Alert } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader } from "./hooks";
import  useCoinGeckoPrices  from "./hooks/CoinGeckoPrices";
import {Header, Account, Faucet, Ramp, Contract, GasGauge, Provider} from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import BigNumber from "bignumber.js";

// https://github.com/yezyilomo/state-pool
import {store, useGlobalState} from 'state-pool';

//import Hints from "./Hints";
import { Hints, ExampleUI, Subgraph, Unitracker } from "./views"
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS, BSC_TOKENS, LPS, CG_COIN_MAPPINGS } from "./constants";

import erc20Abi from "./abi/erc20";
import fetchFarms from "./farms/fetchFarms";

const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

const { ethers } = require("ethers");
// const { erc20Abi } = require("./abi/erc20.json");


// import { masterChefAbi} from "./abi/masterchef.json";

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    📡 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS['localhost']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = false

// 🛰 providers
if(DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
const mainnetProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID)

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
const bscProviderUrl = NETWORKS['bsc'].rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
const bscProviderUrlFromEnv = process.env.BSC_PROVIDER ? process.env.BSC_PROVIDER : bscProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);
const bscProvider = new JsonRpcProvider(bscProviderUrl, {name: "bsc", chainId: 56});


BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const providers = {
  bsc: bscProvider,
  eth: mainnetProvider
};

const contracts = {
  bsc: {
    tokens: {
      cake: new ethers.Contract(BSC_TOKENS.cake.contract, erc20Abi, bscProvider),
      banana: new ethers.Contract(BSC_TOKENS.banana.contract, erc20Abi, bscProvider)
    }
  }
};

store.setState("providers", providers);
store.setState("contracts", contracts);
store.setState("coinPrices", {hasPrices: false});
store.setState("farms", {hasFarms: false});

const coinPriceIds = ["binance-eth", "binance-bitcoin", "binancecoin", "antimatter", "pancakeswap-token"];

async function getPrices() {

  const [farmInfos, cgPrices] = await Promise.all([
     // get the farm info
     fetchFarms(providers),
     // get the usd prices for the base coins
     CoinGeckoClient.simple.price({"vs_currencies": "usd", "ids": coinPriceIds})
  ]);

  if (cgPrices.success) {
    let newCoinPrices = {};
    // transform the keys to the friendlier names (instead of the coingecko id)
    for (let [key, value] of Object.entries(cgPrices.data)) {
      newCoinPrices[CG_COIN_MAPPINGS[key]] = value;
    }

    console.log("newCoinPrices: ", newCoinPrices);

    // now we want to add in the coin prices from the farms
    for (let farm of farmInfos) {
      let tokenPriceVsQuote = BigNumber(farm.tokenPriceVsQuote);
      // get the base token price from CG prices
      if (newCoinPrices[farm.quoteTokenSymbol.toLocaleLowerCase()]) {
        let quoteTokenUsd = BigNumber(newCoinPrices[farm.quoteTokenSymbol.toLocaleLowerCase()].usd).times(tokenPriceVsQuote);
        newCoinPrices[farm.tokenSymbol.toLocaleLowerCase()] = {usd: quoteTokenUsd.toNumber()}
      } else {
        console.log("don't have the coingecko price for quote token: ", farm.quoteTokenSymbol);
      }
    }
    // for (const [key, value] of Object.entries(object)) {
    //   console.log(key, value);
    // }

    console.log("setting new coin prices: ", newCoinPrices);
    store.setState("coinPrices", {hasPrices: true, ...newCoinPrices});


  } else {
    store.setState({hasPrices: false});
    console.log("problem getting coingecko prices: ", cgPrices.message);
  }
}

getPrices();

// const cakeContract = new ethers.Contract('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', erc20Abi, bscProvider);


// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;


function App(props) {
  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork,mainnetProvider);

  // this hook will get some base coin prices from coingecko
  const coinPrices = useCoinGeckoPrices(CoinGeckoClient);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  if(DEBUG) console.log("👩‍💼 selected address:",address)

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  if(DEBUG) console.log("🏠 localChainId",localChainId)

  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId
  if(DEBUG) console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice)

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice)

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);
  if(DEBUG) console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  if(DEBUG) console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider)
  if(DEBUG) console.log("📝 readContracts",readContracts)

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider)
  if(DEBUG) console.log("🔐 writeContracts",writeContracts)

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  //const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI)
  //console.log("🥇DAI contract on mainnet:",mainnetDAIContract)
  //
  // Then read your DAI balance like:
  //const myMainnetBalance = useContractReader({DAI: mainnetDAIContract},"DAI", "balanceOf",["0x34aA3F359A9D614239015126635CE7732c18fDF3"])
  //console.log("💲 myMainnetBalance:",myMainnetBalance)
  //

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts,"YourContract", "purpose")
  console.log("🤗 purpose:",purpose)

  //📟 Listen for broadcast events
  const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);
  console.log("📟 SetPurpose events:",setPurposeEvents)

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */
  let networkDisplay = ""
   /*
  if(localChainId && selectedChainId && localChainId != selectedChainId ){
    console.log("localChainid: ", localChainId);
    console.log("selectedChainId: ", selectedChainId);

    networkDisplay = (
      <div style={{zIndex:2, position:'absolute', right:0,top:60,padding:16}}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={(
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on <b>{NETWORK(localChainId).name}</b>.
            </div>
          )}
          type="error"
          closable={false}
        />
      </div>
    )
  }else{
    networkDisplay = (
      <div style={{zIndex:-1, position:'absolute', right:154,top:28,padding:16,color:targetNetwork.color}}>
        {targetNetwork.name}
      </div>
    )
  }
  */

  networkDisplay = (
     <div style={{zIndex:-1, position:'absolute', right:154,top:28,padding:16,color:targetNetwork.color}}>
       {targetNetwork.name}
     </div>
  );

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  let faucetHint = ""
  const faucetAvailable = localProvider && localProvider.connection && localProvider.connection.url && localProvider.connection.url.indexOf(window.location.hostname)>=0 && !process.env.REACT_APP_PROVIDER && price > 1;

  const [ faucetClicked, setFaucetClicked ] = useState( false );
  if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
    faucetHint = (
      <div style={{padding:16}}>
        <Button type={"primary"} onClick={()=>{
          faucetTx({
            to: address,
            value: parseEther("0.01"),
          });
          setFaucetClicked(true)
        }}>
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    )
  }

  return (
    <div className="App">

      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>

        <Menu style={{ textAlign:"center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link onClick={()=>{setRoute("/")}} to="/">YourContract</Link>
          </Menu.Item>
          <Menu.Item key="/hints">
            <Link onClick={()=>{setRoute("/hints")}} to="/hints">Hints</Link>
          </Menu.Item>
          <Menu.Item key="/exampleui">
            <Link onClick={()=>{setRoute("/exampleui")}} to="/exampleui">ExampleUI</Link>
          </Menu.Item>
          <Menu.Item key="/subgraph">
            <Link onClick={()=>{setRoute("/subgraph")}} to="/subgraph">Subgraph</Link>
          </Menu.Item>
          <Menu.Item key="/unitracker">
            <Link onClick={()=>{setRoute("/unitracker")}} to="/unitracker">Unitracker</Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

            <Contract
              name="YourContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />


            { /* uncomment for a second contract:
            <Contract
              name="SecondContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */ }

            { /* Uncomment to display and interact with an external contract (DAI on mainnet):
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */ }
          </Route>
          <Route path="/hints">
            <Hints
              address={address}
              yourLocalBalance={yourLocalBalance}
              mainnetProvider={mainnetProvider}
              price={price}
            />
          </Route>
          <Route path="/exampleui">
            <ExampleUI
              address={address}
              userProvider={userProvider}
              ethProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              ethPrice={price}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
            />
          </Route>
          <Route path="/subgraph">
            <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
            />
          </Route>
            <Route path="/unitracker">
              <Unitracker
                 ethProvider={mainnetProvider}
                 bscProvider={bscProvider}
                 localProvider={localProvider}
                 yourLocalBalance={yourLocalBalance}
                 coinPrices={coinPrices}
                 tx={tx}
                 writeContracts={writeContracts}
                 readContracts={readContracts}
                 purpose={purpose}
                 setPurposeEvents={setPurposeEvents}
                 // contracts={contracts}
              />
            </Route>
        </Switch>
      </BrowserRouter>


      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
         <Account
           address={address}
           localProvider={localProvider}
           userProvider={userProvider}
           mainnetProvider={mainnetProvider}
           price={price}
           web3Modal={web3Modal}
           loadWeb3Modal={loadWeb3Modal}
           logoutOfWeb3Modal={logoutOfWeb3Modal}
           blockExplorer={blockExplorer}
         />
         {faucetHint}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
       <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
         <Row align="middle" gutter={[4, 4]}>
           <Col span={8}>
             <Ramp price={price} address={address} networks={NETWORKS}/>
           </Col>

           <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
             <GasGauge gasPrice={gasPrice} />
           </Col>
           <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
             <Button
               onClick={() => {
                 window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
               }}
               size="large"
               shape="round"
             >
               <span style={{ marginRight: 8 }} role="img" aria-label="support">
                 💬
               </span>
               Support
             </Button>
           </Col>
         </Row>

         <Row align="middle" gutter={[4, 4]}>
           <Col span={24}>
             {

               /*  if the local provider has a signer, let's show the faucet:  */
               faucetAvailable ? (
                 <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider}/>
               ) : (
                 ""
               )
             }
           </Col>
         </Row>
       </div>
      <div style={{position:'fixed',textAlign:'right',right:0,bottom:20,padding:10}}>
        <Row align="middle" gutter={4}>
          <Col span={10}>
            <Provider name={"mainnet"} provider={mainnetProvider} />
          </Col>
          <Col span={6}>
            <Provider name={"local"} provider={localProvider} />
          </Col>
          <Col span={8}>
            <Provider name={"injected"} provider={injectedProvider} />
          </Col>
          <Col span={8}>
            <Provider name={"BSC"} provider={bscProvider} />
          </Col>
        </Row>
      </div>

    </div>
  );
}


/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

 window.ethereum && window.ethereum.on('chainChanged', chainId => {
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

export default App;
