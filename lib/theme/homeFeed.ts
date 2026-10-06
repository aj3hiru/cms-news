/** Homepage featured layout: posts in the first server response (lead + two rows of three)… */
export const HOME_FIRST = 7;
/** …then this many per scroll step (two rows of three, or three rows of two). */
export const HOME_BATCH = 6;

export interface HomeMoreInfo {
  page: number;
  /** Posts on one homepage page (Customizer → Homepage → Posts per page). */
  perPage: number;
  total: number;
}
