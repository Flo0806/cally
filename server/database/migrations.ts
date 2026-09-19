// Append only. Each entry runs once, in order, tracked via PRAGMA user_version.
export interface Migration {
  version: number;
  name: string;
  sql: string[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial",
    sql: [
      `CREATE TABLE members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL
      )`,
      `CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL
      )`,
      `CREATE TABLE events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        all_day INTEGER NOT NULL DEFAULT 0,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        rrule TEXT,
        exdates TEXT NOT NULL DEFAULT '[]',
        category_id TEXT REFERENCES categories (id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      // Range queries hit start/end; recurring events are expanded in code, so rrule needs no index
      `CREATE INDEX events_start ON events (start)`,
      `CREATE INDEX events_end ON events (end)`,
      `CREATE INDEX events_category ON events (category_id)`,
      // No rows means the event concerns the whole family
      `CREATE TABLE event_members (
        event_id TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
        PRIMARY KEY (event_id, member_id)
      )`,
      `CREATE INDEX event_members_member ON event_members (member_id)`,
      // Hearts on news items are a taste signal per member, category counts rank the news page
      `CREATE TABLE news_hearts (
        member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (member_id, item_id)
      )`,
      `CREATE TABLE todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL,
        member_id TEXT REFERENCES members (id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        done_at TEXT
      )`,
    ],
  },
];
