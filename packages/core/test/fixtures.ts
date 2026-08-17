import type {
  AccountState,
  AgeBand,
  Capability,
  MediaAsset,
  Person,
  Post,
  Signal,
  SignalType,
} from '../src/types';
import type { ActorView } from '../src/policy/decision';

export const T0 = '2026-03-01T09:00:00.000Z';
export const T1 = '2026-03-02T09:00:00.000Z';

const AVATAR: MediaAsset = {
  id: 'media-avatar',
  kind: 'image',
  alt: 'demo avatar',
  seed: 'seed',
  motif: 'wave',
  metadataStripped: true,
};

export function person(id: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    handle: id,
    displayName: id,
    avatar: AVATAR,
    bio: '',
    ageBand: 'adult_18_plus',
    accountState: 'active',
    role: 'member',
    practices: [],
    interests: [],
    canHelpWith: [],
    wantsToLearn: [],
    createdAt: T0,
    demo: true,
    ...overrides,
  };
}

export function actor(
  id: string,
  options: {
    ageBand?: AgeBand;
    accountState?: AccountState;
    role?: 'member' | 'moderator';
    capabilities?: readonly Capability[];
  } = {},
): ActorView {
  return {
    id,
    ageBand: options.ageBand ?? 'adult_18_plus',
    accountState: options.accountState ?? 'active',
    role: options.role ?? 'member',
    capabilities: new Set<Capability>(
      options.capabilities ?? [
        'publish',
        'publish_local',
        'respond_to_unknown_people',
        'appear_in_people_discovery',
        'invite',
      ],
    ),
  };
}

export function post(id: string, authorId: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    authorId,
    geoScopeId: 'geo:city:test',
    caption: 'a caption',
    practice: null,
    media: { ...AVATAR, id: `${id}-media` },
    audience: 'all',
    state: 'published',
    createdAt: T0,
    demo: true,
    ...overrides,
  };
}

export function signal(
  id: string,
  creatorId: string,
  type: SignalType = 'ask',
  overrides: Partial<Signal> = {},
): Signal {
  return {
    id,
    creatorId,
    type,
    title: 'a signal',
    body: 'body',
    geoScopeId: 'geo:city:test',
    practice: null,
    linkedPostId: null,
    placeLabel: null,
    startsAt: null,
    expiresAt: null,
    capacity: null,
    audience: 'all',
    state: 'open',
    createdAt: T0,
    demo: true,
    ...overrides,
  };
}
