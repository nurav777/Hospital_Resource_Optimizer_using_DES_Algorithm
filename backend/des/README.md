# DES engines (Python)

This folder contains three small, single-file discrete-event simulation (DES) engines implemented in Python:

- `clinic_des.py` — outpatient clinic DES (arrivals → registration → consult)
- `or_des.py` — operating room DES (scheduling of surgeries, emergent prioritization)
- `bed_des.py` — inpatient bed allocation DES (admissions/discharges, blocking queue)

Each script:

- Reads a JSON input file (path passed as positional argument)
- Accepts optional `--seed` to make the run deterministic
- Prints a compact JSON summary to stdout

## Files

- `clinic_des.py` — clinic DES implementation
- `or_des.py` — OR DES implementation
- `bed_des.py` — bed allocation DES implementation
- `examples/clinic_input.json` — example input for clinic
- `examples/or_input.json` — example input for OR
- `examples/bed_input.json` — example input for bed DES

## Usage

Run any engine with Python 3.8+:

python backend/des/clinic_des.py backend/des/examples/clinic_input.json --seed 42

The script prints JSON to stdout. You can redirect to a file if desired.

## Input schemas (keys used)

clinic_des.py:

- num_doctors: integer (e.g. 3)
- clinic_minutes_per_day: integer (minutes per day, e.g. 480)
- avg_arrivals_per_hour: number
- avg_consult_minutes: number
- registration_minutes: number
- pct_scheduled: fraction 0..1
- no_show_pct: fraction 0..1
- doctor_break_minutes: number (not currently explicitly modeled beyond availability)
- sim_duration_days: integer

or_des.py:

- num_ors: integer
- or_minutes_per_day: integer
- avg_arrivals_per_hour: number
- avg_case_minutes: number
- pct_emergent: fraction 0..1
- sim_duration_days: integer

bed_des.py:

- num_beds: integer
- arrival_rate_per_hour: number
- avg_los_days: number
- pct_emergent: fraction 0..1
- sim_duration_days: integer

## Outputs

Each script prints a JSON object containing key summary metrics. Examples:

clinic_des.py -> {
"avg_wait_minutes": 3.4,
"doctor_util_percent": 72.1,
"patients_seen_per_day": 54.3,
"max_queue_length": 8
}

or_des.py -> {
"avg_wait_minutes": 12.0,
"cases_scheduled": 45,
"or_utilization_percent": 86.5,
"max_queue_length": 3
}

bed_des.py -> {
"num_beds": 80,
"admitted": 1200,
"blocked": 40,
"avg_occupancy_percent": 82.3,
"max_queue_length": 5
}

## Determinism

All three scripts accept `--seed` to initialize Python's random seed and provide deterministic runs for the same seed and inputs.

## Notes and limitations

- These are compact, single-file DES scripts for quick experimentation and not intended as production-grade simulators.
- Events are modeled at minute resolution; some approximations are used (e.g., fixed mean service durations rather than full distributions, exponential interarrival/LOS where noted).
- The scripts are synchronous and produce a summary; if you need per-patient traces or larger-scale experiments, consider modifying the code to dump details or batch runs.

## Contact / Next steps

If you want: per-patient detailed logs, parallel runs for confidence intervals, or conversion to a package, tell me which enhancements you'd like and I can implement them.
