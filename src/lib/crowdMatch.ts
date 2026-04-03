import { matchPercent } from './pulse';

export {
  explainFriendMatch,
  FAKE_FRIENDS,
  getFakeFriend,
  rankFakeFriends,
  type FakeFriend,
  type RankedFakeFriend,
} from './fakeFriends';

/** 0–100 match for list rows (same as rankFakeFriends’ similarityPercent). */
export function crowdMatchScore(userPulse: number[] | null, friend: { pulse: number[] }): number {
  if (!userPulse?.length) return 0;
  return matchPercent(userPulse, friend.pulse);
}
