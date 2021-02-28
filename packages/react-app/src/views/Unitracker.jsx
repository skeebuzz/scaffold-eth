/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState } from "react";
import {Button, List, Divider, Input, Card, DatePicker, Slider, Switch, Progress, Spin, Row, Col} from "antd";
import { SyncOutlined } from '@ant-design/icons';
import {Address, Balance, TokenBalance} from "../components";
import UniBalance from "../components/UniBalance";
import { parseEther, formatEther } from "@ethersproject/units";

const bscAddress = "0xbE66228bAf51def00493E1bf067a121946Ff4eAe";
const ethAddress = "0x4fB226c08542Ea259fE9336e22F9768fAD473d3D";

export default function Unitracker({purpose,
                                     setPurposeEvents,
                                     ethProvider,
                                     bscProvider,
                                     localProvider,
                                     coinPrices,
                                     tx, readContracts, writeContracts, contracts}) {

   const [newPurpose, setNewPurpose] = useState("loading...");

   return (
      <div>
         {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
         <div style={{border:"1px solid #cccccc", padding:16, width:1024, margin:"auto",marginTop:64}}>
            <h2>Universal Tracker</h2>

            <Row justify={"start"}>
               <Col span={4}><h2>BSC Address</h2></Col>
               <Col span={4}>
                  <Address
                     address={bscAddress}
                     ensProvider={bscProvider}
                     fontSize={16}
                  />
               </Col>
            </Row>
            <Row>
               <Col offset={1}><h3>Assets</h3></Col>
            </Row>

            <Row>
               <Col span={2} offset={1} align={"middle"}>BNB</Col>
               <Col span={3}>
                  <UniBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={false}
                     coin={"bnb"}
                  />
               </Col>
               <Col span={3}>
                  <UniBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={true}
                     coin={"bnb"}
                  />
               </Col>
            </Row>
            <Row>
               <Col span={2} offset={1} align={"middle"}>CAKE</Col>
               <Col span={3}>
                  <TokenBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={false}
                     token={"cake"}
                     // contracts={contracts}
                  />
               </Col>
               <Col span={3}>
                  <TokenBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={true}
                     // contracts={contracts}
                     token={"cake"}
                  />
               </Col>
            </Row>
            <Row>
               <Col span={2} offset={1} align={"middle"}>BANANA</Col>
               <Col span={3}>
                  <TokenBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={false}
                     token={"banana"}
                     // contracts={contracts}
                  />
               </Col>
               <Col span={3}>
                  <TokenBalance
                     address={bscAddress}
                     provider={bscProvider}
                     coinPrices={coinPrices}
                     usd={true}
                     // contracts={contracts}
                     token={"banana"}
                  />
               </Col>
            </Row>

         </div>


      </div>
   );
}
