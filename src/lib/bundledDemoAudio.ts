/**
 * Bundled MP3s for the EDM demo search — Expo needs a Metro asset (`require` / import), not a raw file path.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import alessoHeroesSpacemanEdit from '../../assets/audio/alesso-heroes-spaceman-edit.mp3';
import alessoPendulumFade from '../../assets/audio/alesso-pendulum-fade.mp3';
import anotrTalkToYou from '../../assets/audio/anotr-talk-to-you.mp3';
import armandVanHeldenSoul from '../../assets/audio/armand-van-helden-i-want-your-soul.mp3';
import arminPunctualOnOn from '../../assets/audio/armin-punctual-on-on.mp3';
import beatpulseEdm30s from '../../assets/audio/beatpulse-edm-30s.mp3';
import bobSinclarWorldHoldOn from '../../assets/audio/bob-sinclar-world-hold-on-fisher.mp3';
import chrisLakeAlunaBeggin from '../../assets/audio/chris-lake-aluna-beggin.mp3';
import chrisLakeInTheYuma from '../../assets/audio/chris-lake-in-the-yuma.mp3';
import chrisLakeTurnOffLights from '../../assets/audio/chris-lake-turn-off-the-lights.mp3';
import daftPunkAroundWorld from '../../assets/audio/daft-punk-around-the-world-westend.mp3';
import davidGuettaTitaniumJablonski from '../../assets/audio/david-guetta-titanium-jablonski.mp3';
import fisherLosingIt from '../../assets/audio/fisher-losing-it.mp3';
import johnSummitAllTheTime from '../../assets/audio/john-summit-all-the-time.mp3';
import johnSummitGoBack from '../../assets/audio/john-summit-go-back.mp3';

const BY_ASSET_ID: Record<string, number | string> = {
  'edm-catalog-30s': beatpulseEdm30s,
  'edm-catalog-alesso-heroes-spaceman': alessoHeroesSpacemanEdit,
  'edm-catalog-alesso-pendulum-fade': alessoPendulumFade,
  'edm-catalog-anotr-talk-to-you': anotrTalkToYou,
  'edm-catalog-armand-i-want-your-soul': armandVanHeldenSoul,
  'edm-catalog-armin-on-on': arminPunctualOnOn,
  'edm-catalog-chris-lake-turn-off-lights': chrisLakeTurnOffLights,
  'edm-catalog-chris-lake-aluna-beggin': chrisLakeAlunaBeggin,
  'edm-catalog-chris-lake-yuma': chrisLakeInTheYuma,
  'edm-catalog-bob-sinclar-world-hold-on': bobSinclarWorldHoldOn,
  'edm-catalog-daft-punk-around-world': daftPunkAroundWorld,
  'edm-catalog-guetta-titanium-jablonski': davidGuettaTitaniumJablonski,
  'edm-catalog-fisher-losing-it': fisherLosingIt,
  'edm-catalog-john-summit-go-back': johnSummitGoBack,
  'edm-catalog-john-summit-all-the-time': johnSummitAllTheTime,
};

const PREFIX = 'beatpulse-asset://';

export function isBundledDemoAssetUri(uri: string): boolean {
  return uri.startsWith(PREFIX);
}

function toPlaybackSource(mod: number | string): number | { uri: string } {
  if (typeof mod === 'string') return { uri: mod };
  return mod;
}

/** Pass to `Audio.Sound.createAsync` (native: module id; web: resolves to `{ uri }`). */
export function resolveBundledDemoPlaybackSource(uri: string): number | { uri: string } {
  if (!uri.startsWith(PREFIX)) return { uri };
  const id = uri.slice(PREFIX.length);
  const mod = BY_ASSET_ID[id];
  return mod != null ? toPlaybackSource(mod) : { uri };
}
