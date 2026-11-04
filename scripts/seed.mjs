import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  const res = await client.query('SELECT count(*) FROM classes');
  if (parseInt(res.rows[0].count, 10) === 0) {
    console.log('Seeding initial classes, students, and results...');

    // Insert classes
    const class1 = await client.query(`
      INSERT INTO classes (name, section) VALUES ('Grade 10', 'Section A') RETURNING id;
    `);
    const class2 = await client.query(`
      INSERT INTO classes (name, section) VALUES ('Grade 11', 'Science') RETURNING id;
    `);
    const class3 = await client.query(`
      INSERT INTO classes (name, section) VALUES ('Grade 12', 'Commerce') RETURNING id;
    `);

    const c1Id = class1.rows[0].id;
    const c2Id = class2.rows[0].id;
    const c3Id = class3.rows[0].id;

    // Insert students
    const s1 = await client.query(`
      INSERT INTO students (name, class_id, roll_number, status)
      VALUES ('Eleanor Vance', $1::uuid, 'KIN-10A-01', 'active')
      RETURNING id;
    `, [c1Id]);

    const s2 = await client.query(`
      INSERT INTO students (name, class_id, roll_number, status)
      VALUES ('Theodora Crain', $1::uuid, 'KIN-10A-02', 'active')
      RETURNING id;
    `, [c1Id]);

    const s3 = await client.query(`
      INSERT INTO students (name, class_id, roll_number, status)
      VALUES ('Luke Sanderson', $2::uuid, 'KIN-11S-05', 'active')
      RETURNING id;
    `, [c2Id]);

    const s4 = await client.query(`
      INSERT INTO students (name, class_id, roll_number, status)
      VALUES ('Arthur Dudley', $3::uuid, 'KIN-12C-14', 'active')
      RETURNING id;
    `, [c3Id]);

    // Insert results
    await client.query(`
      INSERT INTO results (student_id, subject, score, grade, date)
      VALUES ($1::uuid, 'Mathematics', 94.5, 'A+', CURRENT_DATE);
    `, [s1.rows[0].id]);

    await client.query(`
      INSERT INTO results (student_id, subject, score, grade, date)
      VALUES ($1::uuid, 'English Literature', 88.0, 'A', CURRENT_DATE);
    `, [s1.rows[0].id]);

    await client.query(`
      INSERT INTO results (student_id, subject, score, grade, date)
      VALUES ($1::uuid, 'Physics', 82.5, 'A', CURRENT_DATE);
    `, [s2.rows[0].id]);

    await client.query(`
      INSERT INTO results (student_id, subject, score, grade, date)
      VALUES ($1::uuid, 'Chemistry', 91.0, 'A+', CURRENT_DATE);
    `, [s3.rows[0].id]);

    console.log('Seeding completed successfully!');
  } else {
    console.log('Database already has data. Skipping seed.');
  }

  await client.end();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
