#!/usr/bin/env python3
"""
ORDES - simple DES for operating room scheduling
Reads input JSON and prints JSON summary
"""
import sys
import json
import heapq
import random
from argparse import ArgumentParser
from typing import Dict

ARRIVAL = 'ARRIVAL'
SURGERY_END = 'SURGERY_END'
SURGERY_START = 'SURGERY_START'


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


def or_sim(params, seed=None):
    if seed is not None:
        random.seed(seed)

    num_ors = int(params.get('num_ors', 3))
    or_minutes_per_day = int(params.get('or_minutes_per_day', 8*60))
    avg_arrivals_per_hour = float(params.get('avg_arrivals_per_hour', 2))
    avg_case_minutes = float(params.get('avg_case_minutes', 90))
    pct_emergent = float(params.get('pct_emergent', 0.1))
    sim_duration_days = int(params.get('sim_duration_days', 7))

    total_minutes = or_minutes_per_day * sim_duration_days
    lambda_per_min = avg_arrivals_per_hour / 60.0

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
        heapq.heappush(events, Event(t, ARRIVAL, {'emergent': is_emergent, 'arrival': t}))

    ors_next_free = [0.0]*num_ors
    or_busy = [0.0]*num_ors
    queue = []  # FIFO, but emergent goes to front
    max_queue = 0

    wait_times = []
    cases_scheduled = 0

    while events:
        ev = heapq.heappop(events)
        now = ev.time
        if ev.etype == ARRIVAL:
            # schedule start if OR free, else queue
            free = None
            for i in range(num_ors):
                if ors_next_free[i] <= now:
                    free = i
                    break
            if free is not None:
                dur = avg_case_minutes
                start = now
                end = start + dur
                ors_next_free[free] = end
                or_busy[free] += dur
                heapq.heappush(events, Event(end, SURGERY_END, {'start': start, 'end': end, 'or': free, 'arrival': ev.data['arrival']}))
                wait_times.append(0.0)
                cases_scheduled += 1
            else:
                # put in queue; emergent to front
                if ev.data.get('emergent'):
                    queue.insert(0, {'arrival': ev.data['arrival'], 'time': now})
                else:
                    queue.append({'arrival': ev.data['arrival'], 'time': now})
                max_queue = max(max_queue, len(queue))
        elif ev.etype == SURGERY_END:
            # free OR and take next from queue
            or_idx = ev.data['or']
            if queue:
                patient = queue.pop(0)
                start = max(now, patient['time'])
                dur = avg_case_minutes
                end = start + dur
                ors_next_free[or_idx] = end
                or_busy[or_idx] += dur
                heapq.heappush(events, Event(end, SURGERY_END, {'start': start, 'end': end, 'or': or_idx, 'arrival': patient['arrival']}))
                wait_times.append(start - patient['time'])
                cases_scheduled += 1

    avg_wait = round(sum(wait_times)/len(wait_times),1) if wait_times else 0.0
    total_busy = sum(or_busy)
    total_avail = num_ors * or_minutes_per_day * sim_duration_days
    util = round((total_busy/total_avail)*100,1) if total_avail>0 else 0.0

    return {
        'avg_wait_minutes': avg_wait,
        'cases_scheduled': cases_scheduled,
        'or_utilization_percent': util,
        'max_queue_length': max_queue
    }


def main():
    p = ArgumentParser()
    p.add_argument('input', help='path to input JSON')
    p.add_argument('--seed', type=int, help='seed', default=None)
    args = p.parse_args()
    params = load_params(args.input)
    out = or_sim(params, seed=args.seed)
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
