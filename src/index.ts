import assert from "assert";
import { Client, TextChannel } from "discord.js";
import { providers, Contract, constants } from "ethers";
import { CRYPTOPUNKS_ABI, CRYPTOPUNKS_ADDRESS } from "./constants.js";
import { AnyLlEvent } from "./types";
import * as notifications from "./sendNotifications.js";

const { AddressZero, Zero } = constants;

assert(process.env.DISCORD_TOKEN !== undefined, "DISCORD_TOKEN is not set");
assert(
  process.env.DISCORD_CHANNELID !== undefined,
  "DISCORD_CHANNELID is not set"
);
assert(process.env.WS_ETH_URL !== undefined, "WS_ETH_URL is not set");

console.log("Connecting to discord");
const client = new Client({ intents: [] });
await client.login(process.env.DISCORD_TOKEN);

console.log(`Fetching discord channel id=${process.env.DISCORD_CHANNELID}`);
const channel = (await client.channels.fetch(
  process.env.DISCORD_CHANNELID
)) as TextChannel | null;
if (channel === null) throw "could not fetch the channel";

console.log(`Setting up eth client url=${process.env.WS_ETH_URL}`);
const provider = new providers.WebSocketProvider(process.env.WS_ETH_URL);

const llMarketAddress = process.env.CRYPTOPUNKS_ADDRESS ?? CRYPTOPUNKS_ADDRESS;
console.log(`Setting up LarvaLabs contract address=${llMarketAddress}`);
const llMarket = new Contract(llMarketAddress, CRYPTOPUNKS_ABI, provider);

console.log(`Listening to events on LarvaLabs contract`);
llMarket.on("*", async (event: AnyLlEvent) => {
  switch (event.event) {
    case "PunkOffered":
      console.log(`New Offer received txHash=${event.transactionHash}`);
      await notifications.sendOffer(channel, provider, event);
      break;
    case "PunkBidEntered":
      console.log(`New Bid received txHash=${event.transactionHash}`);
      await notifications.sendBid(channel, provider, llMarket, event);
      break;
    case "PunkBought":
      if (event.args.value.eq(Zero) && event.args.toAddress !== AddressZero) {
        console.log(`sale for 0ETH, skipping txHash=${event.transactionHash}`);
        break;
      }
      console.log(`New Sale received txHash=${event.transactionHash}`);
      await notifications.sendSale(channel, provider, llMarket, event);
      break;
  }
});
