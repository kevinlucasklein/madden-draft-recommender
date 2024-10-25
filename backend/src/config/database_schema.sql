-- Create tables in order of dependencies
CREATE TABLE players (
    player_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    height VARCHAR(10),
    weight INTEGER,
    college VARCHAR(100),
    handedness VARCHAR(10),
    age INTEGER,
    jersey_num INTEGER,
    years_pro INTEGER
);

CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    label VARCHAR(100)
);

CREATE TABLE positions (
    position_id SERIAL PRIMARY KEY,
    code VARCHAR(10),
    short_label VARCHAR(10),
    position_type VARCHAR(50)
);

CREATE TABLE archetypes (
    archetype_id SERIAL PRIMARY KEY,
    label VARCHAR(100)
);

CREATE TABLE player_ratings (
    rating_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    team_id INTEGER REFERENCES teams(team_id),
    position_id INTEGER REFERENCES positions(position_id),
    archetype_id INTEGER REFERENCES archetypes(archetype_id),
    iteration_label VARCHAR(100),
    overall_rating FLOAT
);

CREATE TABLE player_abilities (
    ability_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    rating_id INTEGER REFERENCES player_ratings(rating_id),
    ability_label VARCHAR(100),
    ability_order INTEGER CHECK (ability_order BETWEEN 1 AND 6)
);

CREATE TABLE player_stats (
    stat_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    rating_id INTEGER REFERENCES player_ratings(rating_id),
    acceleration FLOAT,
    agility FLOAT,
    jumping FLOAT,
    stamina FLOAT,
    strength FLOAT,
    awareness FLOAT,
    bcvision FLOAT,
    block_shedding FLOAT,
    break_sack FLOAT,
    break_tackle FLOAT,
    carrying FLOAT,
    catch_in_traffic FLOAT,
    catching FLOAT,
    change_of_direction FLOAT,
    deep_route_running FLOAT,
    finesse_moves FLOAT,
    hit_power FLOAT,
    impact_blocking FLOAT,
    injury FLOAT,
    juke_move FLOAT,
    kick_accuracy FLOAT,
    kick_power FLOAT,
    kick_return FLOAT,
    lead_block FLOAT,
    man_coverage FLOAT,
    medium_route_running FLOAT,
    pass_block FLOAT,
    pass_block_finesse FLOAT,
    pass_block_power FLOAT,
    play_action FLOAT,
    play_recognition FLOAT,
    power_moves FLOAT,
    press FLOAT,
    pursuit FLOAT,
    release FLOAT,
    run_block FLOAT,
    run_block_finesse FLOAT,
    run_block_power FLOAT,
    running_style VARCHAR(50),  -- Changed from FLOAT to VARCHAR(50)
    short_route_running FLOAT,
    spectacular_catch FLOAT,
    speed FLOAT,
    spin_move FLOAT,
    stiff_arm FLOAT,
    tackle FLOAT,
    throw_accuracy_deep FLOAT,
    throw_accuracy_mid FLOAT,
    throw_accuracy_short FLOAT,
    throw_on_the_run FLOAT,
    throw_power FLOAT,
    throw_under_pressure FLOAT,
    toughness FLOAT,
    trucking FLOAT,
    zone_coverage FLOAT
);

CREATE TABLE player_analysis (
    analysis_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    rating_id INTEGER REFERENCES player_ratings(rating_id),
    player_type VARCHAR(20),
    original_position_score FLOAT,
    best_position_score FLOAT,
    normalized_score FLOAT,
    suggested_position VARCHAR(10),
    position_change_recommended BOOLEAN,
    age_adjusted_score FLOAT,
    projected_pick INTEGER,
    rank INTEGER
);

CREATE TABLE roster_requirements (
    requirement_id SERIAL PRIMARY KEY,
    position VARCHAR(10),
    minimum_players INTEGER,
    maximum_players INTEGER,
    position_group VARCHAR(50),
    is_required BOOLEAN
);

CREATE TABLE draft_sessions (
    session_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    draft_position INTEGER,
    status VARCHAR(20),
    roster_needs JSONB
);

CREATE TABLE draft_picks (
    pick_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES draft_sessions(session_id),
    player_id INTEGER REFERENCES players(player_id),
    round_number INTEGER,
    pick_number INTEGER,
    drafted_position VARCHAR(10),
    picked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE draft_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES draft_sessions(session_id),
    player_id INTEGER REFERENCES players(player_id),
    round_number INTEGER,
    pick_number INTEGER,
    recommendation_score FLOAT,
    reason TEXT
);