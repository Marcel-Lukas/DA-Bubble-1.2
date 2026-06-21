/** A single emoji reaction by one user, stored on a message. */
export interface Reaction {
  reaction: string;
  userId: string;
  userName: string;
}

/** Reactions of the same emoji aggregated for display (count + tooltip lines). */
export interface GroupedReaction {
  reaction: string;
  count:    number;
  names:    string[];
  /** Pre-built "who reacted" line for the tooltip. */
  namesLine:  string;
  /** Pre-built action line (e.g. "hat reagiert") for the tooltip. */
  actionLine: string;
}


