import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schema = `
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  roll_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score NUMERIC,
  grade TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'Allow all classes'
  ) THEN
    CREATE POLICY "Allow all classes" ON classes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Allow all students'
  ) THEN
    CREATE POLICY "Allow all students" ON students FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE results ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'results' AND policyname = 'Allow all results'
  ) THEN
    CREATE POLICY "Allow all results" ON results FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL database...');
  await client.connect();
  console.log('Connected! Executing schema migration...');
  await client.query(schema);
  console.log('Schema migration completed successfully!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
