/** Amount in FCFA. Always an integer, never a decimal. */
export type Fcfa = number;

/** ISO 8601 date-time string, always UTC. */
export type IsoDateTime = string;

/** Business date `YYYY-MM-DD` in Africa/Abidjan. */
export type IsoDate = string;

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
  /** e.g. `createdAt,desc` */
  sort?: string;
}
