export {
  explainFriendMatch,
  FAKE_FRIENDS,
  getFakeFriend,
  rankFakeFriends,
  type FakeFriend,
  type RankedFakeFriend,
} from './fakeFriends';

/** 0–100 shown on cards — each fake friend carries a fixed demo %; wave blend follows it. */
export function crowdMatchScore(
  userPulse: number[] | null,
  friend: { demoPulseMatchPercent: number }
): number {
  if (!userPulse?.length) return 0;
  return friend.demoPulseMatchPercent;
}
