import type { BigNumber, Event } from "ethers";
import { Result } from "ethers/lib/utils";

interface EventBase<N extends string, A> extends Event {
  event: N;
  args: Result & A;
}

export type LlAskEvent = EventBase<
  "PunkOffered",
  {
    punkIndex: BigNumber;
    minValue: BigNumber;
    toAddress: string;
  }
>;

export type LlBidEvent = EventBase<
  "PunkBidEntered",
  {
    punkIndex: BigNumber;
    value: BigNumber;
    fromAddress: string;
  }
>;

export type LlBuyEvent = EventBase<
  "PunkBought",
  {
    punkIndex: BigNumber;
    value: BigNumber;
    fromAddress: string;
    toAddress: string;
  }
>;

export type AnyLlEvent = LlAskEvent | LlBidEvent | LlBuyEvent;
