export type Category = "credential" | "network" | "personal" | "unknown";

export interface Rule {
  /** Becomes the label, e.g. AWS_KEY -> [AWS_KEY_1]. */
  type: string;
  label: string;
  category: Category;
  /** Needs the g flag, plus d when `group` is set. */
  re: RegExp;
  /** Capture group holding the secret when only part of the match is secret. */
  group?: number;
  skip?: (value: string, match: RegExpMatchArray) => boolean;
}

export interface Span {
  start: number;
  end: number;
  value: string;
  placeholder: string;
}

export interface Finding {
  value: string;
  type: string;
  label: string;
  category: Category;
  placeholder: string;
  count: number;
}

export interface Detection {
  /** Sorted, never overlapping. */
  spans: Span[];
  /** In order of first appearance. */
  findings: Finding[];
}

export interface Segment {
  text: string;
  /** Set when this run is a label standing in for a secret. */
  placeholder?: string;
  /** Set when this run is a real value put back for a label. */
  restored?: string;
  /** Set when this run still looks like a label after restoring. */
  leftover?: boolean;
}
