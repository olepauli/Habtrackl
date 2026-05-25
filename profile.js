const express = require('express');
const { getDb, persist } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── GET profile ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT u.username, u.email, u.avatar,
              p.unlocked_achievements, p.daily_challenge_date, p.daily_challenge_done
       FROM users u
       LEFT JOIN profile p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.userId]
    );

    if (!result.length || !result[0].values.length)
      return res.status(404).json({ error: 'Profil nicht gefunden.' });

    const [username, email, avatar, achievements, dailyDate, dailyDone] = result[0].values[0];

    res.json({
      profile: {
        username, email, avatar,
        unlockedAchievements: JSON.parse(achievements || '[]'),
        dailyChallengeDate: dailyDate || '',
        dailyChallengeDone: !!dailyDone
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden des Profils.' });
  }
});

// ── PUT update profile ────────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { avatar, unlockedAchievements, dailyChallengeDate, dailyChallengeDone } = req.body;
    const db = await getDb();

    if (avatar !== undefined) {
      db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatar, req.userId]);
    }

    db.run(
      `INSERT INTO profile (user_id, unlocked_achievements, daily_challenge_date, daily_challenge_done)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         unlocked_achievements = excluded.unlocked_achievements,
         daily_challenge_date  = excluded.daily_challenge_date,
         daily_challenge_done  = excluded.daily_challenge_done`,
      [req.userId,
       JSON.stringify(unlockedAchievements || []),
       dailyChallengeDate || '',
       dailyChallengeDone ? 1 : 0]
    );

    persist();
    res.json({ ok: true });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Fehler beim Speichern des Profils.' });
  }
});

module.exports = router;
