# Final Web App Bugs - 2026-07-15

## Symptom

After adding the daily pointage rule, the app failed to start because Flyway could not create the unique daily index while duplicate pointage rows already existed. A later edit to the applied V11 migration also caused a Flyway checksum mismatch.

## Root Cause

The database already contained multiple `pointage` rows for the same `affectation_id` on `2026-07-15`. The first V11 migration tried to add a unique index without merging those duplicates. After V11 applied successfully, it was edited again, which made Flyway validation fail.

## Fix

V11 now matches the applied checksum again and keeps the duplicate cleanup logic:

- merges duplicates by `affectation_id` and day
- keeps the first entry time
- keeps the last exit time when available
- deletes duplicate rows
- creates the daily unique index

The employer page now displays pointage history on one row with `Entree`, `Sortie`, and a `Complet` / `En cours` status.

## Evidence

Started the application in non-web mode using Java 21 and the IDE classpath. Result:

- Flyway validated 11 migrations
- schema is at version 11
- no migration needed
- JPA initialized
- Spring context started successfully

## Status

DONE
