export const POSITION_STAT_WEIGHTS = {
  QB: {
    throwPower: 1.0,
    throwAccuracyShort: 0.9,
    throwAccuracyMid: 0.9,
    throwAccuracyDeep: 0.8,
    throwOnTheRun: 0.7,
    awareness: 0.8,
    playAction: 0.6,
    throwUnderPressure: 0.7,
    breakSack: 0.5,
    speed: 0.4,
    acceleration: 0.4,
    agility: 0.4,
    strength: 0.3,
  },
  RB: {
    speed: 1.0,
    acceleration: 0.9,
    agility: 0.9,
    carrying: 0.8,
    breakTackle: 0.8,
    bcvision: 0.7,
    trucking: 0.6,
    stiffArm: 0.5,
    jukeMove: 0.7,
    spinMove: 0.7,
    catching: 0.4,
    strength: 0.5,
    stamina: 0.6,
  },
  FB: {
    leadBlock: 1.0,
    impactBlocking: 0.9,
    runBlock: 0.8,
    strength: 0.8,
    awareness: 0.7,
    carrying: 0.6,
    catching: 0.5,
    speed: 0.4,
    acceleration: 0.4,
    trucking: 0.5,
    stamina: 0.6,
  },
  WR: {
    speed: 1.0,
    acceleration: 0.9,
    agility: 0.9,
    catching: 0.9,
    shortRouteRunning: 0.8,
    mediumRouteRunning: 0.8,
    deepRouteRunning: 0.8,
    release: 0.7,
    catchInTraffic: 0.7,
    spectacularCatch: 0.6,
    jumping: 0.6,
    awareness: 0.6,
    stamina: 0.5,
  },
  TE: {
    catching: 0.9,
    runBlock: 0.8,
    strength: 0.8,
    shortRouteRunning: 0.7,
    mediumRouteRunning: 0.7,
    catchInTraffic: 0.8,
    impactBlocking: 0.7,
    speed: 0.6,
    acceleration: 0.6,
    awareness: 0.7,
    stamina: 0.6,
  },
  LT: {
    passBlock: 1.0,
    passBlockPower: 0.9,
    passBlockFinesse: 0.9,
    runBlock: 0.8,
    runBlockPower: 0.8,
    runBlockFinesse: 0.8,
    strength: 0.8,
    awareness: 0.7,
    agility: 0.6,
    acceleration: 0.5,
  },
  RT: {
    passBlock: 1.0,
    passBlockPower: 0.9,
    passBlockFinesse: 0.9,
    runBlock: 0.8,
    runBlockPower: 0.8,
    runBlockFinesse: 0.8,
    strength: 0.8,
    awareness: 0.7,
    agility: 0.6,
    acceleration: 0.5,
  },
  LG: {
    runBlock: 1.0,
    runBlockPower: 0.9,
    runBlockFinesse: 0.9,
    passBlock: 0.8,
    passBlockPower: 0.8,
    passBlockFinesse: 0.8,
    strength: 0.8,
    awareness: 0.7,
    agility: 0.6,
    acceleration: 0.5,
  },
  RG: {
    runBlock: 1.0,
    runBlockPower: 0.9,
    runBlockFinesse: 0.9,
    passBlock: 0.8,
    passBlockPower: 0.8,
    passBlockFinesse: 0.8,
    strength: 0.8,
    awareness: 0.7,
    agility: 0.6,
    acceleration: 0.5,
  },
  C: {
    awareness: 1.0,
    runBlock: 0.9,
    passBlock: 0.9,
    strength: 0.8,
    runBlockPower: 0.8,
    passBlockPower: 0.8,
    agility: 0.6,
    acceleration: 0.5,
    stamina: 0.7,
  },
  DE: {
    powerMoves: 0.9,
    finesseMoves: 0.9,
    blockShedding: 0.9,
    strength: 0.8,
    pursuit: 0.8,
    playRecognition: 0.7,
    tackle: 0.7,
    speed: 0.6,
    acceleration: 0.7,
    awareness: 0.6,
  },
  DT: {
    blockShedding: 1.0,
    strength: 0.9,
    powerMoves: 0.9,
    tackle: 0.8,
    pursuit: 0.7,
    playRecognition: 0.7,
    awareness: 0.6,
    acceleration: 0.5,
    stamina: 0.6,
  },
  MLB: {
    tackle: 1.0,
    playRecognition: 0.9,
    pursuit: 0.9,
    zoneCoverage: 0.8,
    hitPower: 0.8,
    blockShedding: 0.7,
    speed: 0.7,
    acceleration: 0.7,
    awareness: 0.8,
    stamina: 0.6,
  },
  OLB: {
    tackle: 0.9,
    playRecognition: 0.9,
    pursuit: 0.9,
    zoneCoverage: 0.8,
    hitPower: 0.8,
    blockShedding: 0.7,
    speed: 0.8,
    acceleration: 0.8,
    awareness: 0.7,
    stamina: 0.6,
  },
  CB: {
    speed: 1.0,
    acceleration: 0.9,
    agility: 0.9,
    manCoverage: 0.9,
    zoneCoverage: 0.8,
    press: 0.7,
    playRecognition: 0.7,
    jumping: 0.6,
    awareness: 0.7,
    tackle: 0.5,
  },
  FS: {
    zoneCoverage: 1.0,
    speed: 0.9,
    acceleration: 0.9,
    playRecognition: 0.8,
    pursuit: 0.8,
    tackle: 0.7,
    hitPower: 0.6,
    awareness: 0.8,
    jumping: 0.6,
    stamina: 0.6,
  },
  SS: {
    hitPower: 0.9,
    zoneCoverage: 0.9,
    speed: 0.8,
    acceleration: 0.8,
    playRecognition: 0.8,
    pursuit: 0.8,
    tackle: 0.8,
    awareness: 0.7,
    jumping: 0.6,
    stamina: 0.6,
  },
  K: {
    kickPower: 1.0,
    kickAccuracy: 0.9,
    awareness: 0.5,
    stamina: 0.3,
  },
  P: {
    kickPower: 1.0,
    kickAccuracy: 0.9,
    awareness: 0.5,
    stamina: 0.3,
  },
};

export const POSITION_THRESHOLDS = {
  QB: {
    throwPower: 85,
    throwAccuracyShort: 85,
    throwAccuracyMid: 80,
    throwAccuracyDeep: 75,
    throwOnTheRun: 75,
    awareness: 80,
    playAction: 75,
    throwUnderPressure: 75,
    breakSack: 70,
    speed: 65,
    acceleration: 65,
    agility: 65,
    strength: 60,
  },
  RB: {
    speed: 88,
    acceleration: 88,
    agility: 85,
    carrying: 85,
    breakTackle: 80,
    bcvision: 80,
    trucking: 75,
    stiffArm: 75,
    jukeMove: 80,
    spinMove: 80,
    catching: 70,
    strength: 70,
    stamina: 85,
  },
  FB: {
    leadBlock: 85,
    impactBlocking: 85,
    runBlock: 80,
    strength: 85,
    awareness: 75,
    carrying: 70,
    catching: 65,
    speed: 70,
    acceleration: 70,
    trucking: 75,
    stamina: 80,
  },
  WR: {
    speed: 88,
    acceleration: 88,
    agility: 85,
    catching: 85,
    shortRouteRunning: 80,
    mediumRouteRunning: 80,
    deepRouteRunning: 80,
    release: 75,
    catchInTraffic: 75,
    spectacularCatch: 75,
    jumping: 80,
    awareness: 75,
    stamina: 85,
  },
  TE: {
    catching: 80,
    runBlock: 75,
    strength: 80,
    shortRouteRunning: 75,
    mediumRouteRunning: 75,
    catchInTraffic: 80,
    impactBlocking: 75,
    speed: 75,
    acceleration: 75,
    awareness: 75,
    stamina: 80,
  },
  LT: {
    passBlock: 85,
    passBlockPower: 85,
    passBlockFinesse: 85,
    runBlock: 80,
    runBlockPower: 80,
    runBlockFinesse: 80,
    strength: 85,
    awareness: 80,
    agility: 75,
    acceleration: 70,
  },
  RT: {
    passBlock: 85,
    passBlockPower: 85,
    passBlockFinesse: 85,
    runBlock: 80,
    runBlockPower: 80,
    runBlockFinesse: 80,
    strength: 85,
    awareness: 80,
    agility: 75,
    acceleration: 70,
  },
  LG: {
    runBlock: 85,
    runBlockPower: 85,
    runBlockFinesse: 85,
    passBlock: 80,
    passBlockPower: 80,
    passBlockFinesse: 80,
    strength: 85,
    awareness: 80,
    agility: 75,
    acceleration: 70,
  },
  RG: {
    runBlock: 85,
    runBlockPower: 85,
    runBlockFinesse: 85,
    passBlock: 80,
    passBlockPower: 80,
    passBlockFinesse: 80,
    strength: 85,
    awareness: 80,
    agility: 75,
    acceleration: 70,
  },
  C: {
    awareness: 90,
    runBlock: 85,
    passBlock: 85,
    strength: 85,
    runBlockPower: 80,
    passBlockPower: 80,
    agility: 70,
    acceleration: 65,
    stamina: 80,
  },
  DE: {
    powerMoves: 85,
    finesseMoves: 85,
    blockShedding: 85,
    strength: 85,
    pursuit: 80,
    playRecognition: 75,
    tackle: 80,
    speed: 75,
    acceleration: 80,
    awareness: 75,
  },
  DT: {
    blockShedding: 85,
    strength: 90,
    powerMoves: 85,
    tackle: 80,
    pursuit: 75,
    playRecognition: 75,
    awareness: 75,
    acceleration: 70,
    stamina: 80,
  },
  MLB: {
    tackle: 85,
    playRecognition: 85,
    pursuit: 85,
    zoneCoverage: 80,
    hitPower: 80,
    blockShedding: 75,
    speed: 75,
    acceleration: 80,
    awareness: 85,
    stamina: 85,
  },
  OLB: {
    tackle: 85,
    playRecognition: 85,
    pursuit: 85,
    zoneCoverage: 80,
    hitPower: 80,
    blockShedding: 75,
    speed: 80,
    acceleration: 85,
    awareness: 80,
    stamina: 85,
  },
  CB: {
    speed: 90,
    acceleration: 90,
    agility: 85,
    manCoverage: 85,
    zoneCoverage: 80,
    press: 75,
    playRecognition: 75,
    jumping: 80,
    awareness: 75,
    tackle: 70,
  },
  FS: {
    zoneCoverage: 85,
    speed: 85,
    acceleration: 85,
    playRecognition: 85,
    pursuit: 80,
    tackle: 75,
    hitPower: 70,
    awareness: 85,
    jumping: 80,
    stamina: 80,
  },
  SS: {
    hitPower: 85,
    zoneCoverage: 80,
    speed: 80,
    acceleration: 80,
    playRecognition: 85,
    pursuit: 85,
    tackle: 85,
    awareness: 80,
    jumping: 75,
    stamina: 85,
  },
  K: {
    kickPower: 85,
    kickAccuracy: 85,
    awareness: 70,
    stamina: 65,
  },
  P: {
    kickPower: 85,
    kickAccuracy: 85,
    awareness: 70,
    stamina: 65,
  },
};

export const POSITION_TYPES = {
  QB: ['Pocket', 'Scrambler', 'Strong Arm', 'West Coast'],
  RB: ['Power Back', 'Speed Back', 'Receiving Back', 'Balanced'],
  WR: ['Deep Threat', 'Possession', 'Route Runner', 'Slot Specialist'],
  TE: ['Receiving', 'Blocking', 'Vertical Threat', 'Balanced'],
  OL: ['Pass Protector', 'Run Blocker', 'Zone Blocker', 'Power Blocker'],
  DL: ['Pass Rusher', 'Run Stopper', 'Speed Rusher', 'Power Rusher'],
  LB: ['Pass Coverage', 'Run Stopper', 'Pass Rusher', 'Balanced'],
  CB: ['Man Coverage', 'Zone Coverage', 'Press', 'Ball Hawk'],
  S: ['Ball Hawk', 'Run Support', 'Zone Coverage', 'Balanced'],
};

export function determinePlayerType(stats: any, position: string): string {
  const pos = position.substring(0, 2); // Handle variations like "MLB" -> "LB"
  
  switch (pos) {
    case 'QB':
      if (stats.throwPower >= 90) return 'Strong Arm';
      if (stats.speed >= 85) return 'Scrambler';
      if (stats.throwAccuracyShort >= 90) return 'West Coast';
      return 'Pocket';
      
    case 'RB':
      if (stats.trucking >= 85 && stats.strength >= 85) return 'Power Back';
      if (stats.speed >= 90) return 'Speed Back';
      if (stats.catching >= 80) return 'Receiving Back';
      return 'Balanced';
      
    case 'WR':
      if (stats.deepRouteRunning >= 88 && stats.speed >= 90) return 'Deep Threat';
      if (stats.catchInTraffic >= 85 && stats.catching >= 88) return 'Possession';
      if (stats.shortRouteRunning >= 88 && stats.mediumRouteRunning >= 88) return 'Route Runner';
      if (stats.shortRouteRunning >= 85 && stats.agility >= 88) return 'Slot Specialist';
      return 'Balanced';
      
    case 'TE':
      if (stats.catching >= 85 && stats.deepRouteRunning >= 80) return 'Vertical Threat';
      if (stats.runBlock >= 85 && stats.impactBlocking >= 85) return 'Blocking';
      if (stats.catching >= 85 && stats.shortRouteRunning >= 80) return 'Receiving';
      return 'Balanced';
      
    case 'LT':
    case 'RT':
    case 'LG':
    case 'RG':
    case 'C ':
      if (stats.passBlock >= 88 && stats.passBlockFinesse >= 85) return 'Pass Protector';
      if (stats.runBlock >= 88 && stats.runBlockPower >= 85) return 'Run Blocker';
      if (stats.runBlockFinesse >= 85 && stats.agility >= 80) return 'Zone Blocker';
      if (stats.runBlockPower >= 85 && stats.strength >= 88) return 'Power Blocker';
      return 'Balanced';
      
    case 'DE':
    case 'DT':
      if (stats.powerMoves >= 88 && stats.strength >= 88) return 'Power Rusher';
      if (stats.finesseMoves >= 88 && stats.speed >= 85) return 'Speed Rusher';
      if (stats.blockShedding >= 88 && stats.tackle >= 85) return 'Run Stopper';
      if (stats.powerMoves >= 85 && stats.finesseMoves >= 85) return 'Pass Rusher';
      return 'Balanced';
      
    case 'ML':
    case 'OL':
      if (stats.zoneCoverage >= 85 && stats.playRecognition >= 85) return 'Pass Coverage';
      if (stats.blockShedding >= 85 && stats.tackle >= 88) return 'Run Stopper';
      if (stats.finesseMoves >= 85 && stats.speed >= 85) return 'Pass Rusher';
      return 'Balanced';
      
    case 'CB':
      if (stats.manCoverage >= 88) return 'Man Coverage';
      if (stats.zoneCoverage >= 88) return 'Zone Coverage';
      if (stats.press >= 88 && stats.strength >= 80) return 'Press';
      if (stats.playRecognition >= 85 && stats.jumping >= 85) return 'Ball Hawk';
      return 'Balanced';
      
    case 'FS':
    case 'SS':
      if (stats.playRecognition >= 88 && stats.jumping >= 85) return 'Ball Hawk';
      if (stats.hitPower >= 88 && stats.tackle >= 85) return 'Run Support';
      if (stats.zoneCoverage >= 88) return 'Zone Coverage';
      return 'Balanced';
      
    case 'K ':
    case 'P ':
      if (stats.kickPower >= 90) return 'Power';
      if (stats.kickAccuracy >= 90) return 'Accurate';
      return 'Balanced';
      
    default:
      return 'Balanced';
  }
}

// Optional: Add helper function to get available types for a position
export function getAvailableTypes(position: string): string[] {
  const pos = position.substring(0, 2);
  
  switch (pos) {
    case 'QB':
      return ['Strong Arm', 'Scrambler', 'West Coast', 'Pocket'];
    case 'RB':
      return ['Power Back', 'Speed Back', 'Receiving Back', 'Balanced'];
    case 'WR':
      return ['Deep Threat', 'Possession', 'Route Runner', 'Slot Specialist', 'Balanced'];
    case 'TE':
      return ['Vertical Threat', 'Blocking', 'Receiving', 'Balanced'];
    case 'LT':
    case 'RT':
    case 'LG':
    case 'RG':
    case 'C ':
      return ['Pass Protector', 'Run Blocker', 'Zone Blocker', 'Power Blocker', 'Balanced'];
    case 'DE':
    case 'DT':
      return ['Power Rusher', 'Speed Rusher', 'Run Stopper', 'Pass Rusher', 'Balanced'];
    case 'ML':
    case 'OL':
      return ['Pass Coverage', 'Run Stopper', 'Pass Rusher', 'Balanced'];
    case 'CB':
      return ['Man Coverage', 'Zone Coverage', 'Press', 'Ball Hawk', 'Balanced'];
    case 'FS':
    case 'SS':
      return ['Ball Hawk', 'Run Support', 'Zone Coverage', 'Balanced'];
    case 'K ':
    case 'P ':
      return ['Power', 'Accurate', 'Balanced'];
    default:
      return ['Balanced'];
  }
}

export const VERSATILITY_THRESHOLDS = {
  // Defensive Line
  'DE/OLB': {
    finesseMoves: 80,
    powerMoves: 80,
    speed: 80,
    blockShedding: 80,
    tackle: 80,
    pursuit: 80,
    zoneCoverage: 70,
  },
  'DE/DT': {
    strength: 85,
    blockShedding: 85,
    powerMoves: 85,
    tackle: 80,
  },
  'DT/DE': {
    speed: 75,
    finesseMoves: 80,
    pursuit: 75,
  },
  'DT/NT': {
    strength: 90,
    blockShedding: 85,
    weight: 315, // Physical attribute
  },

  // Linebacker
  'OLB/MLB': {
    tackle: 85,
    blockShedding: 85,
    playRecognition: 85,
    zoneCoverage: 80,
  },
  'OLB/SS': {
    speed: 85,
    zoneCoverage: 85,
    manCoverage: 80,
    tackle: 80,
  },
  'MLB/OLB': {
    speed: 80,
    pursuit: 85,
    finesseMoves: 75,
  },

  // Secondary
  'SS/LB': {
    hitPower: 85,
    tackle: 85,
    zoneCoverage: 80,
    speed: 80,
    pursuit: 85,
    playRecognition: 85,
  },
  'SS/FS': {
    speed: 88,
    zoneCoverage: 85,
    manCoverage: 80,
    playRecognition: 85,
  },
  'FS/SS': {
    hitPower: 80,
    tackle: 80,
    pursuit: 80,
  },
  'FS/CB': {
    speed: 90,
    manCoverage: 85,
    agility: 85,
  },
  'CB/S': {
    zoneCoverage: 85,
    tackle: 75,
    playRecognition: 85,
    hitPower: 75,
  },

  // Offensive Skill Positions
  'RB/WR': {
    speed: 88,
    agility: 85,
    catching: 80,
    routeRunning: 75,
  },
  'RB/FB': {
    strength: 80,
    leadBlock: 75,
    impact: 75,
    trucking: 80,
  },
  'FB/RB': {
    speed: 80,
    agility: 75,
    carrying: 80,
    bcvision: 75,
  },
  'FB/TE': {
    catching: 75,
    height: 74, // 6'2"
    routeRunning: 70,
  },
  'WR/RB': {
    carrying: 80,
    bcvision: 75,
    trucking: 70,
    breakTackle: 75,
  },
  'WR/TE': {
    height: 75, // 6'3"
    strength: 75,
    runBlock: 70,
  },
  'TE/WR': {
    speed: 80,
    agility: 80,
    routeRunning: 80,
    release: 75,
  },
  'TE/FB': {
    leadBlock: 80,
    impact: 80,
    strength: 85,
  },
  'TE/T': {
    strength: 85,
    runBlock: 85,
    passBlock: 80,
    weight: 280,
  },

  // Offensive Line
  'T/G': {
    strength: 85,
    runBlock: 85,
    passBlock: 85,
  },
  'G/T': {
    passBlock: 85,
    agility: 75,
    length: 33, // Arm length
  },
  'G/C': {
    awareness: 85,
    strength: 85,
    shotgun: 80, // Snapping ability
  },
  'C/G': {
    runBlock: 85,
    passBlock: 85,
    strength: 85,
  },
};

// Helper function to check if stats meet thresholds
function meetsThresholds(stats: any, thresholds: Record<string, number>): boolean {
  return Object.entries(thresholds).every(([stat, threshold]) => 
    (stats[stat] || 0) >= threshold
  );
}

export function checkVersatility(stats: any, primaryPosition: string): string[] {
  const positions: string[] = [primaryPosition];
  
  switch (primaryPosition) {
    // Defensive Line Versatility
    case 'DE':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['DE/OLB'])) {
        positions.push('OLB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['DE/DT'])) {
        positions.push('DT');
      }
      break;
      
    case 'DT':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['DT/DE'])) {
        positions.push('DE');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['DT/NT'])) {
        positions.push('NT');
      }
      break;

    // Linebacker Versatility
    case 'OLB':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['DE/OLB'])) {
        positions.push('DE');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['OLB/MLB'])) {
        positions.push('MLB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['OLB/SS'])) {
        positions.push('SS');
      }
      break;
      
    case 'MLB':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['MLB/OLB'])) {
        positions.push('OLB');
      }
      break;

    // Secondary Versatility
    case 'SS':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['SS/LB'])) {
        positions.push('OLB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['SS/FS'])) {
        positions.push('FS');
      }
      break;
      
    case 'FS':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['FS/SS'])) {
        positions.push('SS');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['FS/CB'])) {
        positions.push('CB');
      }
      break;
      
    case 'CB':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['CB/S'])) {
        positions.push('FS');
        if (stats.hitPower >= 80) {
          positions.push('SS');
        }
      }
      if (stats.height >= 73 && stats.catching >= 75) { // 6'1" or taller
        positions.push('WR');
      }
      break;

    // Offensive Skill Position Versatility
    case 'RB':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['RB/WR'])) {
        positions.push('WR');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['RB/FB'])) {
        positions.push('FB');
      }
      break;
      
    case 'FB':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['FB/RB'])) {
        positions.push('RB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['FB/TE'])) {
        positions.push('TE');
      }
      break;
      
    case 'WR':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['WR/RB'])) {
        positions.push('RB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['WR/TE'])) {
        positions.push('TE');
      }
      break;
      
    case 'TE':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['TE/WR'])) {
        positions.push('WR');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['TE/FB'])) {
        positions.push('FB');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['TE/T'])) {
        positions.push('RT');
      }
      break;

    // Offensive Line Versatility
    case 'LT':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['T/G'])) {
        positions.push('LG');
      }
      positions.push('RT'); // Can usually play either tackle spot
      break;
      
    case 'RT':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['T/G'])) {
        positions.push('RG');
      }
      positions.push('LT'); // Can usually play either tackle spot
      break;
      
    case 'LG':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['G/T'])) {
        positions.push('LT');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['G/C'])) {
        positions.push('C');
      }
      positions.push('RG'); // Can usually play either guard spot
      break;
      
    case 'RG':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['G/T'])) {
        positions.push('RT');
      }
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['G/C'])) {
        positions.push('C');
      }
      positions.push('LG'); // Can usually play either guard spot
      break;
      
    case 'C':
      if (meetsThresholds(stats, VERSATILITY_THRESHOLDS['C/G'])) {
        positions.push('LG', 'RG');
      }
      break;
  }

  return positions;
}

// Enhance player type determination to include versatility
export function determinePlayerArchetype(stats: any, position: string): {
  primaryType: string;
  secondaryType?: string;
  versatility: string[];
  specialTraits: string[];
} {
  const primaryType = determinePlayerType(stats, position);
  const versatilePositions = checkVersatility(stats, position);
  const specialTraits = determineSpecialTraits(stats, position);
  let secondaryType: string | undefined;

  // Determine secondary type if player is versatile
  if (versatilePositions.length > 1) {
    secondaryType = determinePlayerType(stats, versatilePositions[1]);
  }

  return {
    primaryType,
    secondaryType,
    versatility: versatilePositions,
    specialTraits
  };
}

function determineSpecialTraits(stats: any, position: string): string[] {
  const traits: string[] = [];

  // Universal traits
  if (stats.awareness >= 90) traits.push('High Football IQ');
  if (stats.stamina >= 90) traits.push('Iron Man');
  if (stats.injury >= 90) traits.push('Durable');
  if (stats.strength >= 95) traits.push('Powerhouse');
  if (stats.speed >= 95) traits.push('Blazing Speed');
  if (stats.acceleration >= 95) traits.push('Explosive');

  // Position-specific traits
  switch (position.substring(0, 2)) {
    case 'QB':
      if (stats.throwPower >= 95) traits.push('Cannon Arm');
      if (stats.throwAccuracyShort >= 95) traits.push('Precision Passer');
      if (stats.throwOnTheRun >= 90) traits.push('Mobile Threat');
      if (stats.playAction >= 90) traits.push('Play-Action Master');
      if (stats.throwUnderPressure >= 90) traits.push('Cool Under Pressure');
      if (stats.breakSack >= 90) traits.push('Escape Artist');
      if (stats.speed >= 85 && stats.acceleration >= 85) traits.push('Dual Threat');
      break;

    case 'RB':
      if (stats.breakTackle >= 90) traits.push('Break Away');
      if (stats.bcvision >= 90) traits.push('Field Vision');
      if (stats.catching >= 85) traits.push('Receiving Back');
      if (stats.trucking >= 90) traits.push('Power Runner');
      if (stats.jukeMove >= 90) traits.push('Elusive');
      if (stats.spinMove >= 90) traits.push('Spin Specialist');
      if (stats.stiffArm >= 90) traits.push('Stiff Arm Expert');
      if (stats.carrying >= 90) traits.push('Secure Ball Carrier');
      break;

    case 'FB':
      if (stats.leadBlock >= 90) traits.push('Lead Blocker');
      if (stats.impactBlocking >= 90) traits.push('Bulldozer');
      if (stats.catching >= 85) traits.push('Receiving Fullback');
      if (stats.trucking >= 90) traits.push('Battering Ram');
      break;

    case 'WR':
      if (stats.catching >= 95) traits.push('Sure Hands');
      if (stats.spectacularCatch >= 90) traits.push('Acrobatic');
      if (stats.catchInTraffic >= 90) traits.push('Possession Receiver');
      if (stats.release >= 90) traits.push('Clean Release');
      if (stats.jumping >= 90) traits.push('High Point Specialist');
      if (stats.deepRouteRunning >= 90) traits.push('Deep Threat');
      if (stats.shortRouteRunning >= 90 && stats.mediumRouteRunning >= 90) traits.push('Route Technician');
      break;

    case 'TE':
      if (stats.catching >= 90) traits.push('Reliable Hands');
      if (stats.runBlock >= 90) traits.push('Blocking Specialist');
      if (stats.catchInTraffic >= 90) traits.push('Seam Threat');
      if (stats.impactBlocking >= 90) traits.push('Pancake Blocker');
      if (stats.release >= 85) traits.push('Quick Release');
      break;

    case 'LT':
    case 'RT':
      if (stats.passBlock >= 95) traits.push('Elite Pass Protector');
      if (stats.passBlockFinesse >= 90) traits.push('Technician');
      if (stats.passBlockPower >= 90) traits.push('Anchor');
      if (stats.runBlock >= 90) traits.push('Road Grader');
      if (stats.awareness >= 90) traits.push('Pass Block Vision');
      break;

    case 'LG':
    case 'RG':
    case 'C ':
      if (stats.runBlock >= 95) traits.push('Elite Run Blocker');
      if (stats.runBlockPower >= 90) traits.push('Power Pusher');
      if (stats.runBlockFinesse >= 90) traits.push('Pull Specialist');
      if (stats.passBlock >= 90) traits.push('Pass Protection Expert');
      if (position === 'C ' && stats.awareness >= 95) traits.push('Field General');
      break;

    case 'DE':
      if (stats.powerMoves >= 90) traits.push('Power Rusher');
      if (stats.finesseMoves >= 90) traits.push('Speed Rusher');
      if (stats.blockShedding >= 90) traits.push('Block Shedder');
      if (stats.pursuit >= 90) traits.push('Relentless');
      if (stats.playRecognition >= 90) traits.push('Play Reader');
      break;

    case 'DT':
      if (stats.blockShedding >= 95) traits.push('Gap Stuffer');
      if (stats.strength >= 95) traits.push('Immovable Object');
      if (stats.powerMoves >= 90) traits.push('Interior Rusher');
      if (stats.tackle >= 90) traits.push('Sure Tackler');
      if (stats.pursuit >= 85) traits.push('Chase Down');
      break;

    case 'ML':
      if (stats.tackle >= 95) traits.push('Tackling Machine');
      if (stats.playRecognition >= 95) traits.push('Field General');
      if (stats.pursuit >= 90) traits.push('Sideline to Sideline');
      if (stats.zoneCoverage >= 85) traits.push('Coverage Linebacker');
      if (stats.hitPower >= 90) traits.push('Big Hitter');
      break;

    case 'OL':
      if (stats.finesseMoves >= 90) traits.push('Edge Rusher');
      if (stats.powerMoves >= 90) traits.push('Power Rusher');
      if (stats.pursuit >= 90) traits.push('Chase Down');
      if (stats.tackle >= 90) traits.push('Secure Tackler');
      if (stats.zoneCoverage >= 85) traits.push('Coverage Specialist');
      if (stats.hitPower >= 90) traits.push('Heavy Hitter');
      break;

    case 'CB':
      if (stats.manCoverage >= 95) traits.push('Lockdown Corner');
      if (stats.zoneCoverage >= 90) traits.push('Ball Hawk');
      if (stats.press >= 90) traits.push('Press Specialist');
      if (stats.playRecognition >= 90) traits.push('Route Reader');
      if (stats.jumping >= 90) traits.push('High Jump');
      if (stats.tackle >= 85) traits.push('Sure Tackler');
      break;

    case 'FS':
      if (stats.zoneCoverage >= 95) traits.push('Center Fielder');
      if (stats.playRecognition >= 90) traits.push('Play Reader');
      if (stats.tackle >= 85) traits.push('Open Field Tackler');
      if (stats.jumping >= 90) traits.push('Ball Hawk');
      if (stats.pursuit >= 90) traits.push('Range');
      break;

    case 'SS':
      if (stats.hitPower >= 90) traits.push('Enforcer');
      if (stats.tackle >= 90) traits.push('Sure Tackler');
      if (stats.zoneCoverage >= 85) traits.push('Coverage Safety');
      if (stats.playRecognition >= 90) traits.push('Run Stopper');
      if (stats.pursuit >= 90) traits.push('Downhill');
      break;

    case 'K ':
      if (stats.kickPower >= 95) traits.push('Big Leg');
      if (stats.kickAccuracy >= 95) traits.push('Dead Eye');
      if (stats.kickPower >= 90 && stats.kickAccuracy >= 90) traits.push('Clutch');
      break;

    case 'P ':
      if (stats.kickPower >= 95) traits.push('Booming Leg');
      if (stats.kickAccuracy >= 95) traits.push('Pin Point');
      if (stats.kickPower >= 90 && stats.kickAccuracy >= 90) traits.push('Coffin Corner');
      break;
  }

  return traits;
}