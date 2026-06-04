export interface UserInterface {
  uId: string;
  uName: string;
  uEmail: string;
  uUserImage: string;
  uStatus: boolean;
  uLastReactions: string[];
}

export interface User {
    uId?: string; 
    uName: string; 
    uEmail: string;
    uStatus: boolean; 
    uUserImage: string;
    uLastReactions: string[];
}


