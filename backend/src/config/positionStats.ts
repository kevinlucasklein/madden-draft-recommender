type StatWeight = {
  [key: string]: number;
};

// Define valid position types
export type Position = 
    | 'QB' | 'HB' | 'FB' | 'WR' | 'TE' 
    | 'LT' | 'RT' | 'LG' | 'RG' | 'C' 
    | 'RE' | 'LE' | 'DT' | 'MLB' | 'LOLB' | 'ROLB' 
    | 'CB' | 'FS' | 'SS' | 'K' | 'P';

    export const POSITION_STAT_WEIGHTS: Record<Position, Record<string, number>> = {
      QB: {
        throwPower: 1.0,
        throwAccuracyShort: 1.0,
        throwAccuracyMid: 1.0,
        throwAccuracyDeep: 0.9,
        throwOnTheRun: 0.8,
        throwUnderPressure: 0.8,
        playAction: 0.7,
        breakSack: 0.6,
        speed: 0.5,
        acceleration: 0.5,
        agility: 0.4,
      },
      HB: {
        speed: 1.0,
        acceleration: 1.0,
        agility: 0.9,
        breakTackle: 0.9,
        carrying: 0.9,
        changeOfDirection: 0.8,
        trucking: 0.8,
        jukeMove: 0.8,
        spinMove: 0.7,
        stiffArm: 0.7,
        catching: 0.6,
        stamina: 0.6,
      },
      FB: {
        leadBlock: 1.0,
        impactBlocking: 1.0,
        runBlock: 0.9,
        strength: 0.9,
        carrying: 0.7,
        trucking: 0.7,
        catching: 0.6,
        speed: 0.5,
      },
      WR: {
        catching: 1.0,
        speed: 1.0,
        acceleration: 0.9,
        agility: 0.9,
        release: 0.9,
        shortRouteRunning: 0.9,
        mediumRouteRunning: 0.9,
        deepRouteRunning: 0.8,
        catchInTraffic: 0.8,
        spectacularCatch: 0.7,
        changeOfDirection: 0.7,
        jumping: 0.6,
        stamina: 0.6,
      },
      TE: {
        catching: 1.0,
        runBlock: 0.9,
        shortRouteRunning: 0.9,
        catchInTraffic: 0.9,
        strength: 0.8,
        mediumRouteRunning: 0.8,
        speed: 0.7,
        acceleration: 0.7,
        impactBlocking: 0.7,
        stamina: 0.6,
      },
      LT: {
        passBlock: 1.0,
        passBlockPower: 1.0,
        passBlockFinesse: 0.9,
        strength: 0.9,
        runBlock: 0.8,
        runBlockPower: 0.8,
        runBlockFinesse: 0.7,
        agility: 0.6,
        acceleration: 0.5,
      },
      RT: {
        passBlock: 1.0,
        passBlockPower: 1.0,
        passBlockFinesse: 0.9,
        strength: 0.9,
        runBlock: 0.8,
        runBlockPower: 0.8,
        runBlockFinesse: 0.7,
        agility: 0.6,
        acceleration: 0.5,
      },
      LG: {
        runBlock: 1.0,
        runBlockPower: 1.0,
        strength: 0.9,
        runBlockFinesse: 0.8,
        passBlock: 0.8,
        passBlockPower: 0.8,
        passBlockFinesse: 0.7,
        agility: 0.5,
      },
      RG: {
        runBlock: 1.0,
        runBlockPower: 1.0,
        strength: 0.9,
        runBlockFinesse: 0.8,
        passBlock: 0.8,
        passBlockPower: 0.8,
        passBlockFinesse: 0.7,
        agility: 0.5,
      },
      C: {
        runBlock: 1.0,
        passBlock: 1.0,
        strength: 0.9,
        runBlockPower: 0.8,
        passBlockPower: 0.8,
        agility: 0.5,
      },
      RE: {
        powerMoves: 1.0,
        finesseMoves: 1.0,
        blockShedding: 0.9,
        speed: 0.9,
        acceleration: 0.9,
        strength: 0.8,
        pursuit: 0.7,
        tackle: 0.7,
        stamina: 0.6,
      },
      LE: {
        blockShedding: 1.0,
        powerMoves: 1.0,
        strength: 0.9,
        finesseMoves: 0.9,
        speed: 0.8,
        acceleration: 0.8,
        tackle: 0.8,
        pursuit: 0.7,
        stamina: 0.6,
      },
      DT: {
        blockShedding: 1.0,
        strength: 1.0,
        powerMoves: 0.9,
        tackle: 0.8,
        speed: 0.7,
        acceleration: 0.7,
        pursuit: 0.6,
        stamina: 0.6,
      },
      MLB: {
        tackle: 1.0,
        pursuit: 1.0,
        speed: 0.9,
        acceleration: 0.9,
        hitPower: 0.8,
        zoneCoverage: 0.8,
        blockShedding: 0.8,
        stamina: 0.7,
      },
      LOLB: {
        speed: 1.0,
        acceleration: 1.0,
        tackle: 0.9,
        pursuit: 0.9,
        hitPower: 0.8,
        blockShedding: 0.8,
        finesseMoves: 0.7,
        powerMoves: 0.7,
        zoneCoverage: 0.7,
        stamina: 0.6,
      },
      ROLB: {
        speed: 1.0,
        acceleration: 1.0,
        tackle: 0.9,
        pursuit: 0.9,
        hitPower: 0.8,
        blockShedding: 0.8,
        finesseMoves: 0.7,
        powerMoves: 0.7,
        zoneCoverage: 0.7,
        stamina: 0.6,
      },
      CB: {
        manCoverage: 1.0,
        speed: 1.0,
        acceleration: 0.9,
        agility: 0.9,
        zoneCoverage: 0.8,
        press: 0.8,
        jumping: 0.7,
        changeOfDirection: 0.7,
        stamina: 0.6,
      },
      FS: {
        zoneCoverage: 1.0,
        speed: 0.9,
        acceleration: 0.9,
        pursuit: 0.8,
        tackle: 0.7,
        hitPower: 0.6,
        jumping: 0.6,
        stamina: 0.6,
      },
      SS: {
        hitPower: 1.0,
        zoneCoverage: 0.9,
        tackle: 0.9,
        speed: 0.8,
        acceleration: 0.8,
        pursuit: 0.8,
        jumping: 0.6,
        stamina: 0.6,
      },
      K: {
        kickPower: 1.0,
        kickAccuracy: 1.0,
      },
      P: {
        kickPower: 1.0,
        kickAccuracy: 1.0,
      },
    };

export const POSITION_TIER_THRESHOLDS: Record<Position, {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
}> = {
  // Offense - Key Positions (harder to find elite talent)
  QB: {
      tier1: 85,  // True franchise QBs
      tier2: 70,  // Quality starters
      tier3: 55,  // Serviceable starters
      tier4: 40   // Backups
  },
  WR: {
      tier1: 75,  // Elite receivers
      tier2: 65,  // Solid starters
      tier3: 50,  // Rotational players
      tier4: 35   // Depth pieces
  },
  HB: {
      tier1: 80,  // Elite backs
      tier2: 68,  // Quality starters
      tier3: 55,  // Committee backs
      tier4: 40   // Backups
  },
  TE: {
      tier1: 78,  // Elite all-around TEs
      tier2: 65,  // Quality starters
      tier3: 52,  // Rotational players
      tier4: 38   // Depth/Special teams
  },

  // Offense - Line (consistent thresholds due to similar importance)
  LT: {
      tier1: 80,  // Elite blind side protector
      tier2: 70,  // Quality starter
      tier3: 60,  // Serviceable starter
      tier4: 45   // Backup
  },
  RT: {
      tier1: 78,  // Elite right tackle
      tier2: 68,  // Quality starter
      tier3: 58,  // Serviceable starter
      tier4: 45   // Backup
  },
  LG: {
      tier1: 75,  // Elite guard
      tier2: 65,  // Quality starter
      tier3: 55,  // Serviceable starter
      tier4: 40   // Backup
  },
  RG: {
      tier1: 75,  // Elite guard
      tier2: 65,  // Quality starter
      tier3: 55,  // Serviceable starter
      tier4: 40   // Backup
  },
  C: {
      tier1: 78,  // Elite center
      tier2: 68,  // Quality starter
      tier3: 58,  // Serviceable starter
      tier4: 45   // Backup
  },

  // Defense - Front Seven
  RE: {
    tier1: 82,  // Elite edge rusher
    tier2: 70,  // Quality starter
    tier3: 58,  // Rotational player
    tier4: 45   // Depth piece
  },
  LE: {
      tier1: 82,  // Elite edge setter
      tier2: 70,  // Quality starter
      tier3: 58,  // Rotational player
      tier4: 45   // Depth piece
  },
  DT: {
      tier1: 80,  // Elite interior
      tier2: 68,  // Quality starter
      tier3: 55,  // Rotational player
      tier4: 42   // Depth piece
  },
  MLB: {
      tier1: 80,  // Elite linebacker
      tier2: 70,  // Quality starter
      tier3: 58,  // Serviceable starter
      tier4: 45   // Backup/Special teams
  },
  LOLB: {
      tier1: 78,  // Elite OLB
      tier2: 68,  // Quality starter
      tier3: 55,  // Serviceable starter
      tier4: 42   // Backup/Special teams
  },
  ROLB: {
      tier1: 78,  // Elite OLB
      tier2: 68,  // Quality starter
      tier3: 55,  // Serviceable starter
      tier4: 42   // Backup/Special teams
  },

  // Defense - Secondary (adjusted for your Nickel scheme)
  CB: {
      tier1: 82,  // Shutdown corner
      tier2: 72,  // Quality starter
      tier3: 62,  // Nickel/Rotation
      tier4: 48   // Depth/Special teams
  },
  FS: {
      tier1: 80,  // Elite centerfielder
      tier2: 70,  // Quality starter
      tier3: 60,  // Serviceable starter
      tier4: 45   // Backup
  },
  SS: {
      tier1: 80,  // Elite strong safety
      tier2: 70,  // Quality starter
      tier3: 60,  // Serviceable starter
      tier4: 45   // Backup
  },

  // Special Teams (simplified thresholds)
  K: {
      tier1: 75,  // Elite kicker
      tier2: 65,  // Quality starter
      tier3: 55,  // Serviceable
      tier4: 45   // Marginal
  },
  P: {
      tier1: 75,  // Elite punter
      tier2: 65,  // Quality starter
      tier3: 55,  // Serviceable
      tier4: 45   // Marginal
  },

  // Fullback (less emphasis on tiers due to limited usage)
  FB: {
      tier1: 72,  // Elite fullback
      tier2: 62,  // Quality starter
      tier3: 52,  // Serviceable
      tier4: 42   // Depth
  }
};

export const POSITION_STAT_THRESHOLDS = {
  QB: {
      elite: {
          throwPower: 90,
          throwAccuracyShort: 85,
          throwAccuracyMid: 85,
          throwAccuracyDeep: 85,
          throwOnTheRun: 85
      },
      goodMobility: {
          speed: 85,
          acceleration: 85,
          agility: 85
      }
  },
  HB: {
      elite: {
          speed: 90,
          acceleration: 90,
          agility: 88,
          carrying: 85
      },
      powerBack: {
          trucking: 85,
          breakTackle: 85,
          strength: 80
      }
  },
  FB: {
      elite: {
          impactBlocking: 85,
          leadBlock: 85,
          strength: 80
      },
      receiving: {
          catching: 75,
          shortRouteRunning: 75
      }
  },
  WR: {
      elite: {
          speed: 90,
          acceleration: 90,
          catching: 85,
          shortRouteRunning: 85,
          mediumRouteRunning: 85
      },
      deepThreat: {
          speed: 93,
          deepRouteRunning: 85
      },
      possession: {
          catching: 90,
          catchInTraffic: 85,
          shortRouteRunning: 90
      }
  },
  TE: {
      elite: {
          catching: 85,
          shortRouteRunning: 80,
          mediumRouteRunning: 80,
          strength: 75
      },
      blocking: {
          runBlock: 80,
          impactBlocking: 80,
          strength: 80
      }
  },
  LT: {
    elite: {
        passBlockPower: 85,
        passBlockFinesse: 85,
        strength: 85
    },
    runBlocking: {
        runBlock: 85,
        impactBlocking: 85
    }
  },
  RT: {
      elite: {
          passBlockPower: 85,
          passBlockFinesse: 85,
          strength: 85
      },
      runBlocking: {
          runBlock: 85,
          impactBlocking: 85
      }
  },
  LG: {
    elite: {
        runBlock: 85,
        impactBlocking: 85,
        strength: 85
    },
    passBlocking: {
        passBlockPower: 85,
        passBlockFinesse: 80
    }
  },
  RG: {
      elite: {
          runBlock: 85,
          impactBlocking: 85,
          strength: 85
      },
      passBlocking: {
          passBlockPower: 85,
          passBlockFinesse: 80
      }
  },
  C: {
      elite: {
          runBlock: 85,
          impactBlocking: 85,
          strength: 85
      },
      passBlocking: {
          passBlockPower: 85,
          passBlockFinesse: 80
      }
  },
  RE: {
    elite: {
        powerMoves: 85,
        finesseMoves: 85,
        speed: 85,
        strength: 80
    },
    athletic: {
        acceleration: 85,
        pursuit: 80,
        blockShedding: 80
    }
  },
  LE: {
      elite: {
          blockShedding: 85,
          powerMoves: 85,
          strength: 85,
          tackle: 80
      },
      runStop: {
          pursuit: 80,
          finesseMoves: 80,
          speed: 80
      }
  },
  DT: {
      elite: {
          blockShedding: 85,
          powerMoves: 85,
          strength: 85
      },
      passRush: {
          finesseMoves: 80,
          acceleration: 80,
          pursuit: 75
      }
  },
    // Split LB into individual positions
    MLB: {
      elite: {
          tackle: 85,
          pursuit: 85,
          hitPower: 80,
          playRecognition: 80
      },
      coverage: {
          zoneCoverage: 80,
          speed: 85,
          acceleration: 85
      }
    },
    LOLB: {
        elite: {
            tackle: 85,
            pursuit: 85,
            hitPower: 80,
            playRecognition: 80
        },
        coverage: {
            zoneCoverage: 80,
            speed: 85,
            acceleration: 85
        }
    },
    ROLB: {
        elite: {
            tackle: 85,
            pursuit: 85,
            hitPower: 80,
            playRecognition: 80
        },
        coverage: {
            zoneCoverage: 80,
            speed: 85,
            acceleration: 85
        }
    },
  CB: {
      elite: {
          speed: 90,
          acceleration: 90,
          manCoverage: 85,
          zoneCoverage: 85
      },
      manSpecialist: {
          manCoverage: 90,
          press: 85
      },
      zoneSpecialist: {
          zoneCoverage: 90,
          playRecognition: 85
      }
  },
  FS: {
    elite: {
        zoneCoverage: 85,
        speed: 90,
        acceleration: 90,
        pursuit: 85
    },
    coverage: {
        playRecognition: 85,
        tackle: 75
    }
  },
SS: {
    elite: {
        hitPower: 85,
        zoneCoverage: 80,
        tackle: 85,
        speed: 85
    },
    runSupport: {
        pursuit: 85,
        blockShedding: 75
    }
  },
  K: {
    elite: {
        kickPower: 90,
        kickAccuracy: 85
    }
  },
  P: {
      elite: {
          kickPower: 90,
          kickAccuracy: 85
      }
  }
} as const;