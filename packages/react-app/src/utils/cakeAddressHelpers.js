import addresses from '../config/cakecontracts'

// from pancakeswap

export const getAddress = (address, provider) => {
   return address[provider.network.chainId];
}

export const getCakeAddress = (provider) => {
   return getAddress(addresses.cake, provider)
}
export const getMasterChefAddress = (provider) => {
   return getAddress(addresses.masterChef, provider)
}
export const getMulticallAddress = (provider) => {
   return getAddress(addresses.mulltiCall, provider)
}
export const getWbnbAddress = (provider) => {
   return getAddress(addresses.wbnb, provider)
}
