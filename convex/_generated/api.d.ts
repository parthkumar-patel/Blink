/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aggregation from "../aggregation.js";
import type * as aggregationActions from "../aggregationActions.js";
import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as clubs from "../clubs.js";
import type * as clubsActions from "../clubsActions.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as favorites from "../favorites.js";
import type * as rsvps from "../rsvps.js";
import type * as sampleData from "../sampleData.js";
import type * as search from "../search.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aggregation: typeof aggregation;
  aggregationActions: typeof aggregationActions;
  ai: typeof ai;
  aiActions: typeof aiActions;
  clubs: typeof clubs;
  clubsActions: typeof clubsActions;
  crons: typeof crons;
  events: typeof events;
  favorites: typeof favorites;
  rsvps: typeof rsvps;
  sampleData: typeof sampleData;
  search: typeof search;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
