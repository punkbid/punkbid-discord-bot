import { BigNumber, providers, utils, constants, Contract } from "ethers";
import { type TextChannel, EmbedBuilder } from "discord.js";
import { LlAskEvent, LlBidEvent, LlBuyEvent } from "./types";

function walletString(address: string, name: string | undefined) {
  let string = address.slice(0, 8);
  if (name !== undefined) string += ` (${name})`;
  return string;
}

function walletMarkdownLink(address: string, name: string | undefined) {
  return `[${walletString(
    address,
    name
  )}](https://cryptopunks.app/cryptopunks/accountInfo?account=${address})`;
}

async function lookupAddress(p: providers.WebSocketProvider, address: string) {
  try {
    const name = await p.lookupAddress(address);
    return name ?? undefined;
  } catch (e) {
    return undefined;
  }
}

function createEmbed(
  title: string,
  description: string,
  punkId: number,
  amount: BigNumber,
  color: number
) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setURL(`https://cryptopunks.app/cryptopunks/details/${punkId}`)
    .setDescription(description)
    .setThumbnail(
      `https://cryptopunks.app/cryptopunks/cryptopunk${punkId}.png?size=240&customColor=${color.toString(
        16
      )}`
    )
    .addFields(
      {
        name: "Punk",
        value: `[#${punkId}](https://cryptopunks.app/cryptopunks/details/${punkId})`,
        inline: true,
      },
      {
        name: "Amount",
        value: `${utils.formatEther(amount)} ETH`,
        inline: true,
      }
    );
}

export async function sendOffer(
  c: TextChannel,
  p: providers.WebSocketProvider,
  e: LlAskEvent
) {
  const tx = await e.getTransaction();
  const fromName = await lookupAddress(p, tx.from);

  const embed = createEmbed(
    "New Offer",
    `Punk ${e.args.punkIndex.toNumber()} has been offered for sale for ${utils.formatEther(
      e.args.minValue
    )} ETH`,
    e.args.punkIndex.toNumber(),
    e.args.minValue,
    0x95554f
  ).addFields([
    {
      name: "Seller",
      value: walletMarkdownLink(tx.from, fromName),
      inline: true,
    },
  ]);

  if (e.args.toAddress !== constants.AddressZero) {
    const toName =
      e.args.toAddress === constants.AddressZero
        ? undefined
        : await lookupAddress(p, e.args.toAddress);
    embed.addFields([
      {
        name: "Offered To",
        value: walletMarkdownLink(e.args.toAddress, toName),
      },
    ]);
  }

  await c.send({ embeds: [embed] });
}

export async function sendBid(
  c: TextChannel,
  p: providers.WebSocketProvider,
  llMarket: Contract,
  e: LlBidEvent
) {
  const fromName = await lookupAddress(p, e.args.fromAddress);
  const ownerAddress = await llMarket.punkIndexToAddress(e.args.punkIndex);
  const ownerName = await lookupAddress(p, ownerAddress);

  const embed = createEmbed(
    "New Bid",
    `Punk ${e.args.punkIndex.toNumber()} has a new bid for ${utils.formatEther(
      e.args.value
    )} ETH`,
    e.args.punkIndex.toNumber(),
    e.args.value,
    0x8e6fb6
  ).addFields([
    {
      name: "Bidder",
      value: walletMarkdownLink(e.args.fromAddress, fromName),
      inline: true,
    },
    {
      name: "Owner",
      value: walletMarkdownLink(ownerAddress, ownerName),
    },
  ]);

  await c.send({ embeds: [embed] });
}

export async function sendSale(
  c: TextChannel,
  p: providers.WebSocketProvider,
  llMarket: Contract,
  e: LlBuyEvent
) {
  let value = e.args.value;
  let toAddress = e.args.toAddress;

  // if a seller accepts a bid, handle the larvalabs bug that resets price and buyer
  // before emitting the PunkBought event
  if (value.eq(constants.Zero) && toAddress === constants.AddressZero) {
    console.log("this is an acceptBid sale, retrieving last bid");
    const bidEvents = (await llMarket.queryFilter(
      llMarket.filters.PunkBidEntered(e.args.punkIndex)
    )) as LlBidEvent[];
    if (bidEvents.length === 0) {
      console.log("Could not find a suitable bid event, skipping");
      return;
    }
    const lastBid = bidEvents[bidEvents.length - 1];
    value = lastBid.args.value;
    toAddress = lastBid.args.fromAddress;
  }

  const fromName = await lookupAddress(p, e.args.fromAddress);
  const toName = await lookupAddress(p, e.args.toAddress);

  const embed = createEmbed(
    "New Sale",
    `Punk ${e.args.punkIndex.toNumber()} has been sold for ${utils.formatEther(
      value
    )} ETH`,
    e.args.punkIndex.toNumber(),
    value,
    0x638596
  ).addFields([
    {
      name: "Buyer",
      value: walletMarkdownLink(toAddress, toName),
      inline: true,
    },
    {
      name: "Seller",
      value: walletMarkdownLink(e.args.fromAddress, fromName),
    },
  ]);

  await c.send({ embeds: [embed] });
}
