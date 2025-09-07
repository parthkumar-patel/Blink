/* eslint-disable */
// @ts-nocheck
import type * as React from 'react';

declare module 'react-big-calendar' {
  export const Calendar: React.ComponentType<any>;
  export function momentLocalizer(moment: any): any;
  export const Views: { MONTH: any; WEEK: any; DAY: any; AGENDA?: any };
  export type View = any;
}
