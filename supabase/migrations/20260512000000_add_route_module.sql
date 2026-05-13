-- 1. Route Cycles
CREATE TABLE IF NOT EXISTS route_cycles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho',
    supervisor_user_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Route Cycle Weeks
CREATE TABLE IF NOT EXISTS route_cycle_weeks (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente'
);

-- 3. Route Client Snapshot
CREATE TABLE IF NOT EXISTS route_clients_snapshot (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL,
    owner_user_id INTEGER NOT NULL,
    supervisor_user_id INTEGER NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(20),
    classification VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_base_km DOUBLE PRECISION,
    source_base VARCHAR(50),
    source_logistic_type VARCHAR(50)
);

-- 4. Route Assignments
CREATE TABLE IF NOT EXISTS route_assignments (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    week_id INTEGER REFERENCES route_cycle_weeks(id) ON DELETE CASCADE,
    client_snapshot_id INTEGER REFERENCES route_clients_snapshot(id) ON DELETE CASCADE,
    assigned_by INTEGER,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assignment_mode VARCHAR(20) DEFAULT 'automatic',
    notes TEXT
);

-- 5. Route Sequences
CREATE TABLE IF NOT EXISTS route_sequences (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    week_id INTEGER REFERENCES route_cycle_weeks(id) ON DELETE CASCADE,
    supervisor_user_id INTEGER REFERENCES users(id),
    route_date DATE,
    start_lat DOUBLE PRECISION,
    start_lng DOUBLE PRECISION,
    start_label VARCHAR(255),
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    end_label VARCHAR(255),
    total_distance_km DOUBLE PRECISION,
    total_duration_minutes INTEGER,
    average_km_per_visit DOUBLE PRECISION,
    total_visits INTEGER,
    optimization_provider VARCHAR(50) DEFAULT 'HERE',
    optimization_status VARCHAR(50) DEFAULT 'pending',
    raw_response_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Route Sequence Items
CREATE TABLE IF NOT EXISTS route_sequence_items (
    id SERIAL PRIMARY KEY,
    route_sequence_id INTEGER REFERENCES route_sequences(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    client_snapshot_id INTEGER REFERENCES route_clients_snapshot(id),
    client_id INTEGER NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    classification VARCHAR(50),
    stop_lat DOUBLE PRECISION,
    stop_lng DOUBLE PRECISION,
    distance_from_previous_km DOUBLE PRECISION,
    duration_from_previous_minutes INTEGER,
    logistic_note TEXT,
    is_week_start BOOLEAN DEFAULT FALSE,
    manually_changed BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pendente'
);

-- 7. Route Clusters
CREATE TABLE IF NOT EXISTS route_clusters (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    supervisor_user_id INTEGER NOT NULL,
    week_id INTEGER REFERENCES route_cycle_weeks(id) ON DELETE CASCADE,
    state VARCHAR(2),
    city VARCHAR(100),
    cluster_name VARCHAR(100),
    classification VARCHAR(50),
    total_clients INTEGER,
    average_distance_km DOUBLE PRECISION
);

-- 8. Route Blocks
CREATE TABLE IF NOT EXISTS route_blocks (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    supervisor_user_id INTEGER NOT NULL,
    week_id INTEGER REFERENCES route_cycle_weeks(id) ON DELETE CASCADE,
    block_name VARCHAR(100),
    block_type VARCHAR(50),
    state VARCHAR(2),
    city VARCHAR(100),
    total_clients INTEGER,
    notes TEXT
);

-- 9. Route Execution Logs
CREATE TABLE IF NOT EXISTS route_execution_logs (
    id SERIAL PRIMARY KEY,
    route_sequence_id INTEGER REFERENCES route_sequences(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    action_by INTEGER REFERENCES users(id),
    payload_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Visit Checkins
CREATE TABLE IF NOT EXISTS visit_checkins (
    id SERIAL PRIMARY KEY,
    route_sequence_item_id INTEGER REFERENCES route_sequence_items(id) ON DELETE CASCADE,
    checkin_at TIMESTAMP WITH TIME ZONE NOT NULL,
    checkin_lat DOUBLE PRECISION,
    checkin_lng DOUBLE PRECISION,
    checkout_at TIMESTAMP WITH TIME ZONE,
    checkout_lat DOUBLE PRECISION,
    checkout_lng DOUBLE PRECISION,
    checkin_source VARCHAR(50),
    notes TEXT
);

-- 11. Visit Results
CREATE TABLE IF NOT EXISTS visit_results (
    id SERIAL PRIMARY KEY,
    route_sequence_item_id INTEGER REFERENCES route_sequence_items(id) ON DELETE CASCADE,
    result_status VARCHAR(50) NOT NULL,
    sale_made BOOLEAN DEFAULT FALSE,
    sale_value DOUBLE PRECISION,
    notes TEXT,
    registered_by INTEGER REFERENCES users(id),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Route Audit Logs
CREATE TABLE IF NOT EXISTS route_audit_logs (
    id SERIAL PRIMARY KEY,
    entity_name VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Route Exports
CREATE TABLE IF NOT EXISTS route_exports (
    id SERIAL PRIMARY KEY,
    route_cycle_id INTEGER REFERENCES route_cycles(id) ON DELETE CASCADE,
    export_type VARCHAR(20) NOT NULL,
    export_scope VARCHAR(50) NOT NULL,
    filters_json JSONB,
    generated_by INTEGER REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_url TEXT,
    file_name VARCHAR(255)
);

-- Habilitar RLS (Opcional, mas recomendado para Supabase)
ALTER TABLE route_cycles ENABLE ROW LEVEL SECURITY;
-- Adicionar políticas básicas aqui...
