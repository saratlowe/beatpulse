import type { NavigatorScreenParams } from '@react-navigation/native';

export type LogStackParamList = {
  LogEventMain: undefined;
  TapSession: { mode?: 'relive' } | undefined;
  RefineVibe: undefined;
  PulseSignature: undefined;
  FriendMatch: undefined;
  EventRecommendations: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
};

export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  FriendPulseDetail: { friendId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  LogEvent: NavigatorScreenParams<LogStackParamList> | undefined;
  Discover: NavigatorScreenParams<DiscoverStackParamList> | undefined;
  Profile: undefined;
};
