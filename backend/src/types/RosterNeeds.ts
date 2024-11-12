export interface PositionNeed {
    min: number;
    max: number;
    current: number;
  }
  
  export interface RosterNeeds {
    QB: PositionNeed;
    WR: PositionNeed;
    HB: PositionNeed;
    TE: PositionNeed;
    LT: PositionNeed;
    RT: PositionNeed;
    LG: PositionNeed;
    RG: PositionNeed;
    C: PositionNeed;
    RE: PositionNeed;
    LE: PositionNeed;
    DT: PositionNeed;
    LOLB: PositionNeed;
    ROLB: PositionNeed;
    MLB: PositionNeed;
    CB: PositionNeed;
    FS: PositionNeed;
    SS: PositionNeed;
    K: PositionNeed;
    P: PositionNeed;
    FB: PositionNeed;
  }
  
  export const DEFAULT_ROSTER_NEEDS: RosterNeeds = {
    QB: { min: 2, max: 3, current: 0 },
    WR: { min: 5, max: 6, current: 0 },
    HB: { min: 3, max: 4, current: 0 },
    TE: { min: 2, max: 3, current: 0 },
    LT: { min: 2, max: 3, current: 0 },
    RT: { min: 2, max: 3, current: 0 },
    LG: { min: 2, max: 3, current: 0 },
    RG: { min: 2, max: 3, current: 0 },
    C: { min: 2, max: 2, current: 0 },
    RE: { min: 2, max: 3, current: 0 },
    LE: { min: 2, max: 3, current: 0 },
    DT: { min: 3, max: 4, current: 0 },
    LOLB: { min: 2, max: 3, current: 0 },
    ROLB: { min: 2, max: 3, current: 0 },
    MLB: { min: 2, max: 3, current: 0 },
    CB: { min: 5, max: 6, current: 0 },
    FS: { min: 2, max: 2, current: 0 },
    SS: { min: 2, max: 2, current: 0 },
    K: { min: 1, max: 1, current: 0 },
    P: { min: 1, max: 1, current: 0 },
    FB: { min: 1, max: 1, current: 0 }
  };