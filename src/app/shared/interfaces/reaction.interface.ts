export interface Reaction {
  reaction: string;
  userId: string;
  userName: string;
}

export interface GroupedReaction {
  reaction: string;
  count:    number;
  names:    string[];
  namesLine:  string;
  actionLine: string;
}


