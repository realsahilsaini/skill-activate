#!/usr/bin/env sh

cat <<'EOF'
INSTRUCTION: MANDATORY SKILL ACTIVATION SEQUENCE

Before responding, you MUST complete these steps in order:

STEP 1 — EVALUATE: For each skill listed in <available_skills>, write one line:
  [skill-name]: YES — [one-line reason it applies] OR NO — [one-line reason it does not]

STEP 2 — ACTIVATE: For every skill you marked YES in Step 1:
  Call the Skill() tool with that skill's name RIGHT NOW.
  Do not skip this. Do not defer it. A YES with no Skill() call is a failure.

STEP 3 — IMPLEMENT: Only after all YES skills are activated, proceed with the response.

If no skills in <available_skills> are relevant, write: "No skills needed for this prompt." and proceed.

CRITICAL: This sequence is MANDATORY on every message. A skill evaluation that does not result in a Skill() call for every YES is incomplete.
EOF
