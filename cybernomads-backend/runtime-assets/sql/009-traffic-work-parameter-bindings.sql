ALTER TABLE traffic_works
    ADD COLUMN parameter_bindings_json TEXT NOT NULL DEFAULT '[]';
