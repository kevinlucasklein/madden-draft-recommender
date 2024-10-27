import { gql } from '@apollo/client/core';

export const GET_ALL_PLAYERS = gql`
  query GetAllPlayers {
    players {
      id
      firstName
      lastName
      height
      weight
      college
      handedness
      age
      jerseyNumber
      yearsPro
      position {
        name
        type
      }
      team {
        label
      }
      archetype {
        name
      }
      abilities {
        name
        description
      }
      ratings {
        overall
      }
      stats {
        speed
        acceleration
        agility
        jumping
        stamina
        strength
        awareness
        bcvision
        blockShedding
        breakSack
        breakTackle
        carrying
        catchInTraffic
        catching
        changeOfDirection
        deepRouteRunning
        finesseMoves
        hitPower
        impactBlocking
        injury
        jukeMove
        kickAccuracy
        kickPower
        kickReturn
        leadBlock
        manCoverage
        mediumRouteRunning
        passBlock
        passBlockFinesse
        passBlockPower
        playAction
        playRecognition
        powerMoves
        press
        pursuit
        release
        runBlock
        runBlockFinesse
        runBlockPower
        runningStyle
        shortRouteRunning
        spectacularCatch
        spinMove
        stiffArm
        tackle
        throwAccuracyDeep
        throwAccuracyMid
        throwAccuracyShort
        throwOnTheRun
        throwPower
        throwUnderPressure
        toughness
        trucking
        zoneCoverage
      }
    }
  }
`;