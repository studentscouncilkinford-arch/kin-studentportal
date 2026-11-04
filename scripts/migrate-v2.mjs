import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schema = `
-- Drop old tables if they exist
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Ensure classes table exists
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New unified users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'staff')),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  access_classes BOOLEAN DEFAULT false,
  access_results BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Results table (referencing users table)
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score NUMERIC,
  grade TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON users;
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON results;
CREATE POLICY "Allow all" ON results FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'Allow all classes'
  ) THEN
    CREATE POLICY "Allow all classes" ON classes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL database...');
  await client.connect();
  console.log('Connected! Executing V2 schema migration...');
  await client.query(schema);
  console.log('Schema created! Seeding initial data...');

  // Get or create classes
  let classRes = await client.query('SELECT id, name FROM classes ORDER BY name');
  if (classRes.rows.length === 0) {
    await client.query(`
      INSERT INTO classes (name, section) VALUES 
      ('Grade 10', 'Section A'),
      ('Grade 11', 'Science'),
      ('Grade 12', 'Commerce');
    `);
    classRes = await client.query('SELECT id, name FROM classes ORDER BY name');
  }

  const classMap = {};
  classRes.rows.forEach(c => { classMap[c.name] = c.id; });
  const grade10Id = classMap['Grade 10'] || classRes.rows[0].id;
  const grade11Id = classMap['Grade 11'] || classRes.rows[0].id;

  const defaultPasswordHash = bcrypt.hashSync('Kinford2026', 10);

  // Insert initial students
  const u1 = await client.query(`
    INSERT INTO users (name, email, password_hash, user_type, class_id)
    VALUES ('Eleanor Vance', 'eleanorvancekinford@gmail.com', $1, 'student', $2)
    RETURNING id;
  `, [defaultPasswordHash, grade10Id]);

  const u2 = await client.query(`
    INSERT INTO users (name, email, password_hash, user_type, class_id)
    VALUES ('Theodora Crain', 'theodoracrainkinford@gmail.com', $1, 'student', $2)
    RETURNING id;
  `, [defaultPasswordHash, grade10Id]);

  const u3 = await client.query(`
    INSERT INTO users (name, email, password_hash, user_type, class_id)
    VALUES ('Sabit Rahman', 'sabitrahmankinford@gmail.com', $1, 'student', $2)
    RETURNING id;
  `, [defaultPasswordHash, grade11Id]);

  // Insert initial staff
  await client.query(`
    INSERT INTO users (name, email, password_hash, user_type, access_classes, access_results)
    VALUES ('Dr. John Montague', 'johnmontaguekinford@gmail.com', $1, 'staff', true, true);
  `, [defaultPasswordHash]);

  await client.query(`
    INSERT INTO users (name, email, password_hash, user_type, access_classes, access_results)
    VALUES ('Mrs. Clara Dudley', 'claradudleykinford@gmail.com', $1, 'staff', true, false);
  `, [defaultPasswordHash]);

  // Insert sample results
  await client.query(`
    INSERT INTO results (student_id, subject, score, grade, date)
    VALUES 
    ($1, 'Mathematics', 94.5, 'A+', CURRENT_DATE),
    ($1, 'English Literature', 88.0, 'A', CURRENT_DATE),
    ($2, 'Physics', 85.0, 'A', CURRENT_DATE),
    ($3, 'Biology', 91.5, 'A+', CURRENT_DATE);
  `, [u1.rows[0].id, u2.rows[0].id, u3.rows[0].id]);

  console.log('V2 migration & seeding completed successfully!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
