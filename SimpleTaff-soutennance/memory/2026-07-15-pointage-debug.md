# Pointage API Debug - 2026-07-15

## Symptom

The employer page reported:

- `GET /api/pointages/today` returning `404`
- `POST /api/pointages/scanner` returning `500`
- one `403` for a protected resource

## Root Cause Hypothesis

`/api/pointages/today` exists in `PointageController`, and the compiled class in `target/classes` contains `getPointagesToday()`. A live `404` therefore points to a stale or different server process on port `8080`, not the current source.

The `500` risk in the pointage flow came from building API responses after repository/service transactions while accessing lazy relations:

- `PointageController.toResponse()` reads `pointage.getAffectation().getAgent()`
- `affectation` and `agent` are lazy associations
- repository/service methods did not fetch those relations explicitly

## Fix

Added `@EntityGraph` to fetch the relations required by the JSON response:

- `PointageRepository.findByAffectationIdAndDateHeureSortieIsNull`
- `PointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc`
- `AffectationRepository.findByAgentIdAndStatut`

## Verification

Static verification completed. Runtime verification was blocked because this shell has no `mvn` command and `java` is Java 8 while the project requires Java 21.

## Status

DONE_WITH_CONCERNS
