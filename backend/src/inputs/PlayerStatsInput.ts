import { InputType, Field, Int, Float } from 'type-graphql';

@InputType()
export class CreatePlayerStatsInput {
    @Field(() => Int)
    playerId!: number;

    @Field(() => Int, { nullable: true })
    ratingId?: number;

    @Field(() => Float, { nullable: true })
    acceleration?: number;

    @Field(() => Float, { nullable: true })
    agility?: number;

    @Field(() => Float, { nullable: true })
    jumping?: number;

    @Field(() => Float, { nullable: true })
    stamina?: number;

    @Field(() => Float, { nullable: true })
    strength?: number;

    @Field(() => Float, { nullable: true })
    awareness?: number;

    @Field(() => Float, { nullable: true })
    bcvision?: number;

    @Field(() => Float, { nullable: true })
    blockShedding?: number;

    @Field(() => Float, { nullable: true })
    breakSack?: number;

    @Field(() => Float, { nullable: true })
    breakTackle?: number;

    @Field(() => Float, { nullable: true })
    carrying?: number;

    @Field(() => Float, { nullable: true })
    catchInTraffic?: number;

    @Field(() => Float, { nullable: true })
    catching?: number;

    @Field(() => Float, { nullable: true })
    changeOfDirection?: number;

    @Field(() => Float, { nullable: true })
    deepRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    finesseMoves?: number;

    @Field(() => Float, { nullable: true })
    hitPower?: number;

    @Field(() => Float, { nullable: true })
    impactBlocking?: number;

    @Field(() => Float, { nullable: true })
    injury?: number;

    @Field(() => Float, { nullable: true })
    jukeMove?: number;

    @Field(() => Float, { nullable: true })
    kickAccuracy?: number;

    @Field(() => Float, { nullable: true })
    kickPower?: number;

    @Field(() => Float, { nullable: true })
    kickReturn?: number;

    @Field(() => Float, { nullable: true })
    leadBlock?: number;

    @Field(() => Float, { nullable: true })
    manCoverage?: number;

    @Field(() => Float, { nullable: true })
    mediumRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    passBlock?: number;

    @Field(() => Float, { nullable: true })
    passBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    passBlockPower?: number;

    @Field(() => Float, { nullable: true })
    playAction?: number;

    @Field(() => Float, { nullable: true })
    playRecognition?: number;

    @Field(() => Float, { nullable: true })
    powerMoves?: number;

    @Field(() => Float, { nullable: true })
    press?: number;

    @Field(() => Float, { nullable: true })
    pursuit?: number;

    @Field(() => Float, { nullable: true })
    release?: number;

    @Field(() => Float, { nullable: true })
    runBlock?: number;

    @Field(() => Float, { nullable: true })
    runBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    runBlockPower?: number;

    @Field(() => String, { nullable: true })
    runningStyle?: string;

    @Field(() => Float, { nullable: true })
    shortRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    spectacularCatch?: number;

    @Field(() => Float, { nullable: true })
    speed?: number;

    @Field(() => Float, { nullable: true })
    spinMove?: number;

    @Field(() => Float, { nullable: true })
    stiffArm?: number;

    @Field(() => Float, { nullable: true })
    tackle?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyDeep?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyMid?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyShort?: number;

    @Field(() => Float, { nullable: true })
    throwOnTheRun?: number;

    @Field(() => Float, { nullable: true })
    throwPower?: number;

    @Field(() => Float, { nullable: true })
    throwUnderPressure?: number;

    @Field(() => Float, { nullable: true })
    toughness?: number;

    @Field(() => Float, { nullable: true })
    trucking?: number;

    @Field(() => Float, { nullable: true })
    zoneCoverage?: number;

}

@InputType()
export class UpdatePlayerStatsInput {
    @Field(() => Int, { nullable: true })
    ratingId?: number;

    @Field(() => Float, { nullable: true })
    acceleration?: number;

    @Field(() => Float, { nullable: true })
    agility?: number;

    @Field(() => Float, { nullable: true })
    jumping?: number;

    @Field(() => Float, { nullable: true })
    stamina?: number;

    @Field(() => Float, { nullable: true })
    strength?: number;

    @Field(() => Float, { nullable: true })
    awareness?: number;

    @Field(() => Float, { nullable: true })
    bcvision?: number;

    @Field(() => Float, { nullable: true })
    blockShedding?: number;

    @Field(() => Float, { nullable: true })
    breakSack?: number;

    @Field(() => Float, { nullable: true })
    breakTackle?: number;

    @Field(() => Float, { nullable: true })
    carrying?: number;

    @Field(() => Float, { nullable: true })
    catchInTraffic?: number;

    @Field(() => Float, { nullable: true })
    catching?: number;

    @Field(() => Float, { nullable: true })
    changeOfDirection?: number;

    @Field(() => Float, { nullable: true })
    deepRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    finesseMoves?: number;

    @Field(() => Float, { nullable: true })
    hitPower?: number;

    @Field(() => Float, { nullable: true })
    impactBlocking?: number;

    @Field(() => Float, { nullable: true })
    injury?: number;

    @Field(() => Float, { nullable: true })
    jukeMove?: number;

    @Field(() => Float, { nullable: true })
    kickAccuracy?: number;

    @Field(() => Float, { nullable: true })
    kickPower?: number;

    @Field(() => Float, { nullable: true })
    kickReturn?: number;

    @Field(() => Float, { nullable: true })
    leadBlock?: number;

    @Field(() => Float, { nullable: true })
    manCoverage?: number;

    @Field(() => Float, { nullable: true })
    mediumRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    passBlock?: number;

    @Field(() => Float, { nullable: true })
    passBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    passBlockPower?: number;

    @Field(() => Float, { nullable: true })
    playAction?: number;

    @Field(() => Float, { nullable: true })
    playRecognition?: number;

    @Field(() => Float, { nullable: true })
    powerMoves?: number;

    @Field(() => Float, { nullable: true })
    press?: number;

    @Field(() => Float, { nullable: true })
    pursuit?: number;

    @Field(() => Float, { nullable: true })
    release?: number;

    @Field(() => Float, { nullable: true })
    runBlock?: number;

    @Field(() => Float, { nullable: true })
    runBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    runBlockPower?: number;

    @Field(() => String, { nullable: true })
    runningStyle?: string;

    @Field(() => Float, { nullable: true })
    shortRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    spectacularCatch?: number;

    @Field(() => Float, { nullable: true })
    speed?: number;

    @Field(() => Float, { nullable: true })
    spinMove?: number;

    @Field(() => Float, { nullable: true })
    stiffArm?: number;

    @Field(() => Float, { nullable: true })
    tackle?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyDeep?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyMid?: number;

    @Field(() => Float, { nullable: true })
    throwAccuracyShort?: number;

    @Field(() => Float, { nullable: true })
    throwOnTheRun?: number;

    @Field(() => Float, { nullable: true })
    throwPower?: number;

    @Field(() => Float, { nullable: true })
    throwUnderPressure?: number;

    @Field(() => Float, { nullable: true })
    toughness?: number;

    @Field(() => Float, { nullable: true })
    trucking?: number;

    @Field(() => Float, { nullable: true })
    zoneCoverage?: number;
}