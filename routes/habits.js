const express = require('express');
const { getDb, persist } = require('./db');
const auth = require('./middleware/auth');

const router = express.Router();

// All routes require auth
router.use(auth);

// ── GET all habits + completions for user ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getDb();

    const habitsResult = db.exec(
      `SELECT id, name, emoji, active_days, goal, created_at FROM habits WHERE user_id = ? ORDER BY rowid ASC`,
      [req.userId]
    );

    const habits = [];
    if (habitsResult.length > 0) {
      for (const row of habitsResult[0].values) {
        const [id, name, emoji, activeDays, goal, createdAt] = row;

        // Get completions for this habit
        const compResult = db.exec(
          `SELECT date FROM completions WHERE habit_id = ? AND user_id = ?`,
          [id, req.userId]
        );

        const completions = {};
        if (compResult.length > 0) {
          compResult[0].values.forEach(([date]) => { completions[date] = true; });
        }

        habits.push({
          id,
          name,
          emoji,
          activeDays: JSON.parse(activeDays || '[0,1,2,3,4,5,6]'),
          goal: goal ? JSON.parse(goal) : null,
          createdAt,
          completions
        });
      }
    }

    res.json({ habits });
  } catch (err) {
    console.error('GET habits error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Habits.' });
  }
});

// ── POST create habit ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { id, name, emoji, activeDays, goal, createdAt } = req.body;

    if (!id || !name) return res.status(400).json({ error: 'id und name sind erforderlich.' });

    const db = await getDb();
    db.run(
      `INSERT OR REPLACE INTO habits (id, user_id, name, emoji, active_days, goal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, name, emoji || '🏃', JSON.stringify(activeDays || [0,1,2,3,4,5,6]),
       goal ? JSON.stringify(goal) : null, createdAt]
    );
    persist();

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST habit error:', err);
    res.status(500).json({ error: 'Fehler beim Speichern des Habits.' });
  }
});

// ── PUT update habit ──────────────────────────────────────────────────────────
router.put('/:habitId', async (req, res) => {
  try {
    const { name, emoji, activeDays, goal } = req.body;
    const db = await getDb();

    db.run(
      `UPDATE habits SET name=?, emoji=?, active_days=?, goal=?, updated_at=datetime('now') WHERE id=? AND user_id=?`,
      [name, emoji, JSON.stringify(activeDays), goal ? JSON.stringify(goal) : null,
       req.params.habitId, req.userId]
    );
    persist();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Updaten.' });
  }
});

// ── DELETE habit ──────────────────────────────────────────────────────────────
router.delete('/:habitId', async (req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM completions WHERE habit_id = ? AND user_id = ?`, [req.params.habitId, req.userId]);
    db.run(`DELETE FROM habits WHERE id = ? AND user_id = ?`, [req.params.habitId, req.userId]);
    persist();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen.' });
  }
});

// ── POST toggle completion for a date ─────────────────────────────────────────
router.post('/:habitId/toggle', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date erforderlich.' });

    const db = await getDb();

    // Check if completion exists
    const existing = db.exec(
      `SELECT id FROM completions WHERE habit_id = ? AND user_id = ? AND date = ?`,
      [req.params.habitId, req.userId, date]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`DELETE FROM completions WHERE habit_id = ? AND user_id = ? AND date = ?`,
        [req.params.habitId, req.userId, date]);
      persist();
      res.json({ done: false });
    } else {
      db.run(`INSERT INTO completions (habit_id, user_id, date) VALUES (?, ?, ?)`,
        [req.params.habitId, req.userId, date]);
      persist();
      res.json({ done: true });
    }
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Fehler beim Togglen.' });
  }
});

// ── POST sync all habits at once (bulk save) ──────────────────────────────────
router.post('/sync', async (req, res) => {
  try {
    const { habits } = req.body;
    if (!Array.isArray(habits)) return res.status(400).json({ error: 'habits array erforderlich.' });

    const db = await getDb();

    for (const h of habits) {
      db.run(
        `INSERT OR REPLACE INTO habits (id, user_id, name, emoji, active_days, goal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [h.id, req.userId, h.name, h.emoji || '🏃',
         JSON.stringify(h.activeDays || [0,1,2,3,4,5,6]),
         h.goal ? JSON.stringify(h.goal) : null, h.createdAt]
      );

      // Sync completions
      const dates = Object.entries(h.completions || {}).filter(([, v]) => v).map(([d]) => d);
      db.run(`DELETE FROM completions WHERE habit_id = ? AND user_id = ?`, [h.id, req.userId]);
      for (const date of dates) {
        db.run(`INSERT OR IGNORE INTO completions (habit_id, user_id, date) VALUES (?, ?, ?)`,
          [h.id, req.userId, date]);
      }
    }

    persist();
    res.json({ ok: true, synced: habits.length });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync fehlgeschlagen.' });
  }
});

module.exports = router;
