#!/usr/bin/env python3
"""
ClinicDES - single-file DES for a clinic
Inputs: JSON file with keys described in README
Outputs: prints JSON summary
"""
import sys
import json
import heapq
import random
import math
from argparse import ArgumentParser
from typing import Dict

# Event types
ARRIVAL = 'ARRIVAL'
REGISTER_COMPLETE = 'REGISTER_COMPLETE'
SERVICE_START = 'SERVICE_START'
SERVICE_END = 'SERVICE_END'


def load_params(path: str) -> Dict:
    with open(path, 'r') as f:
        return json.load(f)


class Event:
    def __init__(self, time, etype, data=None):
        self.time = time
        self.etype = etype
        self.data = data or {}
    def __lt__(self, other):
        return self.time < other.time


def clinic_sim(params, seed=None):
    if seed is not None:
        random.seed(seed)

    # parameters with defaults
    num_doctors = int(params.get('num_doctors', 2))
    clinic_minutes_per_day = int(params.get('clinic_minutes_per_day', 480))
    avg_arrivals_per_hour = float(params.get('avg_arrivals_per_hour', 20))
    avg_consult_minutes = float(params.get('avg_consult_minutes', 15))
    registration_minutes = float(params.get('registration_minutes', 5))
    pct_scheduled = float(params.get('pct_scheduled', 0.3))
    no_show_pct = float(params.get('no_show_pct', 0.1))
    doctor_break_minutes = float(params.get('doctor_break_minutes', 30))
    sim_duration_days = int(params.get('sim_duration_days', 7))

    total_minutes = clinic_minutes_per_day * sim_duration_days

    # arrival rate per minute
    lambda_per_min = avg_arrivals_per_hour / 60.0

    # initialize doctors (next free time)
    doctors_next_free = [0.0] * num_doctors
    doctor_busy_time = [0.0] * num_doctors

    # queues: list of patients waiting for doctor after registration
    queue = []  # list of dicts with arrival_time and ready_time
    max_queue_len = 0

    # stats
    wait_times = []
    patients_seen = 0
    patients_seen_per_day = [0] * sim_duration_days

    # event queue
    events = []

    # generate arrivals via exponential interarrival
    t = 0.0
    while t < total_minutes:
        # interarrival
        if lambda_per_min <= 0:
            break
        ia = random.expovariate(lambda_per_min)
        t += ia
        if t >= total_minutes:
            break
        # scheduled flag
        is_scheduled = random.random() < pct_scheduled
        if is_scheduled and random.random() < no_show_pct:
            # no-show: skip scheduling arrival
            continue
        # arrival event
        heapq.heappush(events, Event(t, ARRIVAL, {'scheduled': is_scheduled, 'orig_arrival': t}))

    # helper to find free doctor index at time
    def get_free_doctor(now):
        for i in range(num_doctors):
            if doctors_next_free[i] <= now:
                return i
        return None

    # process events
    while events:
        ev = heapq.heappop(events)
        now = ev.time
        if ev.etype == ARRIVAL:
            # patient goes through registration, then ready for doctor
            ready_time = now + registration_minutes
            heapq.heappush(events, Event(ready_time, REGISTER_COMPLETE, {'arrival': now, 'ready': ready_time}))
        elif ev.etype == REGISTER_COMPLETE:
            # join doctor queue
            queue.append({'arrival': ev.data['arrival'], 'ready': ev.data['ready']})
            max_queue_len = max(max_queue_len, len(queue))
            # try to start service immediately if doctor free
            doc_idx = get_free_doctor(now)
            if doc_idx is not None and queue:
                patient = queue.pop(0)
                start_time = max(now, patient['ready'])
                # schedule service end
                end_time = start_time + avg_consult_minutes
                doctors_next_free[doc_idx] = end_time
                doctor_busy_time[doc_idx] += (end_time - start_time)
                heapq.heappush(events, Event(end_time, SERVICE_END, {'start': start_time, 'end': end_time, 'doc': doc_idx, 'arrival': patient['arrival']}))
        elif ev.etype == SERVICE_END:
            # record stats
            start = ev.data['start']
            arrival = ev.data['arrival']
            wait = start - (arrival + registration_minutes)
            wait_times.append(max(0.0, wait))
            patients_seen += 1
            day = int(ev.time // clinic_minutes_per_day) if clinic_minutes_per_day>0 else 0
            if 0 <= day < sim_duration_days:
                patients_seen_per_day[day] += 1
            # after service end, check queue for next patient
            doc_idx = ev.data['doc']
            if queue:
                patient = queue.pop(0)
                start_time = max(ev.time, patient['ready'])
                end_time = start_time + avg_consult_minutes
                doctors_next_free[doc_idx] = end_time
                doctor_busy_time[doc_idx] += (end_time - start_time)
                heapq.heappush(events, Event(end_time, SERVICE_END, {'start': start_time, 'end': end_time, 'doc': doc_idx, 'arrival': patient['arrival']}))

    # compute outputs
    avg_wait_minutes = round(sum(wait_times) / len(wait_times), 1) if wait_times else 0.0
    total_doctor_minutes = sum(doctor_busy_time)
    total_available = num_doctors * clinic_minutes_per_day * sim_duration_days
    doctor_util_percent = round((total_doctor_minutes / total_available) * 100, 1) if total_available>0 else 0.0
    patients_seen_per_day_avg = round(patients_seen / sim_duration_days, 1)

    return {
        'avg_wait_minutes': avg_wait_minutes,
        'doctor_util_percent': doctor_util_percent,
        'patients_seen_per_day': patients_seen_per_day_avg,
        'max_queue_length': max_queue_len
    }


def main():
    p = ArgumentParser()
    p.add_argument('input', help='path to input JSON')
    p.add_argument('--seed', type=int, help='random seed', default=None)
    args = p.parse_args()
    params = load_params(args.input)
    out = clinic_sim(params, seed=args.seed)
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
