import { demoMatchPercentForSession, type FakeFriend } from './fakeFriends';

export {
  explainFriendMatch,
  FAKE_FRIENDS,
  getFakeFriend,
  rankFakeFriends,
  type FakeFriend,
  type RankedFakeFriend,
} from './fakeFriends';

/** 0–100 on cards — same session offset as {@link rankFakeFriends}; wave blend follows this value. */
export function crowdMatchScore(
  userPulse: number[] | null,
  friend: FakeFriend,
  jitterKey?: string | null
): number {
  return demoMatchPercentForSession(friend, userPulse?.length ? jitterKey : null);
}
