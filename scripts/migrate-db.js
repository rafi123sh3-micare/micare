const { Client } = require('pg');

const PASSWORD = 'pass@12406106';
const POOLER_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com';
const DB_CONFIG = {
  password: PASSWORD,
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

const SOURCE = { ...DB_CONFIG, user: 'postgres.douutqnghesgmgcobehs', host: POOLER_HOST };
const TARGET = { ...DB_CONFIG, user: 'postgres.lbuveiutdjwqzebmelob', host: POOLER_HOST };

async function getTables(client) {
  const res = await client.query(`
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return res.rows;
}

async function getColumns(client, schema, table) {
  const res = await client.query(`
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.ordinal_position,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    ) pk ON pk.column_name = c.column_name
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [schema, table]);
  return res.rows;
}

async function getEnums(client) {
  const res = await client.query(`
    SELECT t.typname as enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);
  return res.rows;
}

async function getSequences(client) {
  const res = await client.query(`
    SELECT sequence_schema, sequence_name, data_type,
           start_value, minimum_value, maximum_value, increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `);
  return res.rows;
}

async function getForeignKeys(client, schema, table) {
  const res = await client.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
  `, [schema, table]);
  return res.rows;
}

function mapDataType(col) {
  let sqlType = col.data_type;
  if (col.data_type === 'character varying' || col.data_type === 'character') {
    sqlType = col.character_maximum_length
      ? `varchar(${col.character_maximum_length})`
      : col.data_type === 'character' ? 'char' : 'varchar';
  } else if (col.data_type === 'numeric' || col.data_type === 'decimal') {
    sqlType = 'numeric';
  } else if (col.data_type === 'boolean') {
    sqlType = 'boolean';
  } else if (col.data_type === 'timestamp without time zone') {
    sqlType = 'timestamp';
  } else if (col.data_type === 'timestamp with time zone') {
    sqlType = 'timestamptz';
  } else if (col.data_type === 'time without time zone') {
    sqlType = 'time';
  } else if (col.data_type === 'time with time zone') {
    sqlType = 'timetz';
  } else if (col.data_type === 'double precision') {
    sqlType = 'float8';
  } else if (col.data_type === 'real') {
    sqlType = 'float4';
  } else if (col.data_type === 'bigint') {
    sqlType = 'bigint';
  } else if (col.data_type === 'integer') {
    sqlType = 'integer';
  } else if (col.data_type === 'smallint') {
    sqlType = 'smallint';
  } else if (col.data_type === 'text') {
    sqlType = 'text';
  } else if (col.data_type === 'uuid') {
    sqlType = 'uuid';
  } else if (col.data_type === 'jsonb') {
    sqlType = 'jsonb';
  } else if (col.data_type === 'json') {
    sqlType = 'json';
  } else if (col.data_type === 'bytea') {
    sqlType = 'bytea';
  }
  return sqlType;
}

async function copyDatabase() {
  console.log('Connecting to source database...');
  const source = new Client(SOURCE);
  await source.connect();
  console.log('Connected to source.');

  console.log('Connecting to target database...');
  const target = new Client(TARGET);
  await target.connect();
  console.log('Connected to target.');

  // 1. Get enums
  console.log('\n--- Processing enums ---');
  const enums = await getEnums(source);
  for (const en of enums) {
    const vals = en.enum_values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
    const sql = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${en.enum_name}') THEN CREATE TYPE public.${en.enum_name} AS ENUM (${vals}); END IF; END $$;`;
    console.log(`  Creating enum: ${en.enum_name}`);
    try {
      await target.query(sql);
    } catch (e) {
      console.error(`  Error creating enum ${en.enum_name}:`, e.message);
    }
  }

  // 2. Get tables
  const tables = await getTables(source);
  console.log(`\nFound ${tables.length} tables in public schema.`);

  for (const t of tables) {
    const { table_schema, table_name } = t;
    console.log(`\n--- Processing table: ${table_name} ---`);

    const columns = await getColumns(source, table_schema, table_name);
    const fks = await getForeignKeys(source, table_schema, table_name);

    // Generate CREATE TABLE
    const colDefs = columns.map(c => {
      let def = `    "${c.column_name}" ${mapDataType(c)}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      return def;
    });

    // Add PK constraint
    const pkCols = columns.filter(c => c.is_primary_key).map(c => `"${c.column_name}"`);
    if (pkCols.length > 0) {
      colDefs.push(`    PRIMARY KEY (${pkCols.join(', ')})`);
    }

    const createSQL = `CREATE TABLE IF NOT EXISTS public.${table_name} (\n${colDefs.join(',\n')}\n);`;
    console.log('  Creating table...');
    try {
      await target.query(createSQL);
    } catch (e) {
      console.error(`  Error creating table ${table_name}:`, e.message);
    }

    // Add foreign keys
    for (const fk of fks) {
      const fkSQL = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${fk.constraint_name}' AND table_schema = '${table_schema}') THEN ALTER TABLE public.${table_name} ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES public.${fk.foreign_table_name}("${fk.foreign_column_name}") ON DELETE ${fk.delete_rule} ON UPDATE ${fk.update_rule}; END IF; END $$;`;
      try {
        await target.query(fkSQL);
      } catch (e) {
        console.error(`  Error adding FK ${fk.constraint_name}:`, e.message);
      }
    }

    // Copy data
    console.log(`  Copying data from ${table_name}...`);
    try {
      const dataRes = await source.query(`SELECT * FROM public.${table_name}`);
      const rows = dataRes.rows;
      if (rows.length > 0) {
        const colNames = columns.map(c => `"${c.column_name}"`).join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO public.${table_name} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        for (const row of rows) {
          const values = columns.map(c => row[c.column_name] ?? null);
          try {
            await target.query(insertSQL, values);
          } catch (e) {
            console.error(`  Error inserting row into ${table_name}:`, e.message);
          }
        }
        console.log(`  Inserted ${rows.length} rows.`);
      } else {
        console.log('  No data to copy.');
      }
    } catch (e) {
      console.error(`  Error copying data for ${table_name}:`, e.message);
    }
  }

  await source.end();
  await target.end();
  console.log('\n--- Migration complete ---');
}

copyDatabase().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
