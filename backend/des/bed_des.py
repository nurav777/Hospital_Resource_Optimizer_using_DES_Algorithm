#!/usr/bin/env python3
"""
BedDES - bed allocation DES
Reads input JSON and prints JSON summary
"""
import sys
import json
import heapq
import random
from argparse import ArgumentParser
from typing import Dict

ADMIT = 'ADMIT'
DISCHARGE = 'DISCHARGE'


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


def bed_sim(params, seed=None):
    if seed is not None:
        random.seed(seed)

    num_beds = int(params.get('num_beds', 50))
    arrival_rate_per_hour = float(params.get('arrival_rate_per_hour', 5))
    avg_los_days = float(params.get('avg_los_days', 4))
    pct_emergent = float(params.get('pct_emergent', 0.2))
    sim_duration_days = int(params.get('sim_duration_days', 30))

    total_minutes = sim_duration_days * 24 * 60
    lambda_per_min = arrival_rate_per_hour / 60.0

    events = []
    t = 0.0
    # generate arrivals
    while t < total_minutes:
        if lambda_per_min<=0:
            break
        ia = random.expovariate(lambda_per_min)
        t += ia
        if t>=total_minutes:
            break
        is_emergent = random.random() < pct_emergent
        heapq.heappush(events, Event(t, ADMIT, {'emergent': is_emergent, 'arrival': t}))

    beds_free = num_beds
    queue = []  # waiting for bed
    max_queue = 0
    blocked = 0
    admitted = 0
    total_occupancy_time = 0.0

    while events:
        ev = heapq.heappop(events)
        now = ev.time
        if ev.etype == ADMIT:
            # if bed available, admit and schedule discharge
            if beds_free > 0:
                beds_free -= 1
                admitted += 1
                los_days = random.expovariate(1.0/avg_los_days) if avg_los_days>0 else avg_los_days
                los_minutes = max(1.0, los_days * 24 * 60)
                total_occupancy_time += los_minutes
                discharge_time = now + los_minutes
                heapq.heappush(events, Event(discharge_time, DISCHARGE, {}))
            else:
                # no bed: patient queued
                queue.append({'arrival': now})
                max_queue = max(max_queue, len(queue))
                blocked += 1
        elif ev.etype == DISCHARGE:
            beds_free += 1
            # admit next in queue if any
            if queue:
                patient = queue.pop(0)
                # immediate admit
                beds_free -= 1
                admitted += 1
                los_days = random.expovariate(1.0/avg_los_days) if avg_los_days>0 else avg_los_days
                los_minutes = max(1.0, los_days * 24 * 60)
                total_occupancy_time += los_minutes
                discharge_time = now + los_minutes
                heapq.heappush(events, Event(discharge_time, DISCHARGE, {}))

    avg_occupancy = round((total_occupancy_time / (num_beds * total_minutes)) * 100, 1) if total_minutes>0 else 0.0

    return {
        'num_beds': num_beds,
        'admitted': admitted,
        'blocked': blocked,
        'avg_occupancy_percent': avg_occupancy,
        'max_queue_length': max_queue
    }


def main():
    p = ArgumentParser()
    p.add_argument('input', help='path to input JSON')
    p.add_argument('--seed', type=int, help='seed', default=None)
    args = p.parse_args()
    params = load_params(args.input)
    out = bed_sim(params, seed=args.seed)
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
