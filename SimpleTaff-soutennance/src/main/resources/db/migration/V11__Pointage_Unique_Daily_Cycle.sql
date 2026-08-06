CREATE TEMP TABLE pointage_daily_merge AS
SELECT
    (array_agg(id ORDER BY date_heure_entree ASC))[1] AS keep_id,
    affectation_id,
    date_heure_entree::date AS pointage_day,
    MIN(date_heure_entree) AS first_entree,
    MAX(date_heure_sortie) AS last_sortie
FROM pointage
GROUP BY affectation_id, date_heure_entree::date
HAVING COUNT(*) > 1;

UPDATE pointage p
SET
    date_heure_entree = m.first_entree,
    date_heure_sortie = COALESCE(m.last_sortie, p.date_heure_sortie)
FROM pointage_daily_merge m
WHERE p.id = m.keep_id;

DELETE FROM pointage p
USING pointage_daily_merge m
WHERE p.affectation_id = m.affectation_id
  AND p.date_heure_entree::date = m.pointage_day
  AND p.id <> m.keep_id;

DROP TABLE pointage_daily_merge;

CREATE UNIQUE INDEX idx_pointage_affectation_jour
ON pointage (affectation_id, (date_heure_entree::date));
