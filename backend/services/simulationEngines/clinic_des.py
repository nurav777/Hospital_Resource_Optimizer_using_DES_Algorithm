#!/usr/bin/env python3
"""
ClinicDES - simple discrete-event simulation of a clinic using minutes as base unit.
Reads parameters from JSON file and prints JSON summary.
"""
import sys
import json
import heapq
import argparse
import random
import math
from collections import deque, defaultdict

# Event types
ARRIVAL = 'ARRIVAL'
REG_COMPLETE = 'REG_COMPLETE'
SERVICE_START = 'SERVICE_START'
SERVICE_END = 'SERVICE_END'
BREAK_START = 'BREAK_START'
BREAK_END = 'BREAK_END'

def read_input(path):
    with open(path) as f:
        return json.load(f)

class Event:
    def __init__(self, time, etype, payload=None):
        self.time = time
        self.etype = etype
        self.payload = payload or {}
    def __lt__(self, other):
        return self.time < other.time

class ClinicDES:
    def __init__(self, params, seed=None):
        self.p = params
        if seed is not None:
            random.seed(seed)
        # simulation clock in minutes
        self.day_minutes = int(self.p.get('clinic_minutes_per_day', 480))
        self.sim_duration_days = int(self.p.get('sim_duration_days', 7))
        self.duration_minutes = self.sim_duration_days * self.day_minutes
        # resources
        self.num_doctors = int(self.p.get('num_doctors', 2))
        self.doctor_break_minutes = int(self.p.get('doctor_break_minutes', 30))
        # queues
        self.reg_queue = deque()
        self.doc_queue = deque()
        # event queue
        self.events = []
        # stats
        self.wait_times = []
        self.max_queue = 0
        self.patients_seen_daily = defaultdict(int)
        self.doctor_busy_until = [0]*self.num_doctors
        self.doctor_available = [True]*self.num_doctors
        self.total_doctor_busy = [0]*self.num_doctors
        # for registration
        self.registration_minutes = int(self.p.get('registration_minutes', 5))
        # arrivals
        self.avg_arrivals_per_hour = float(self.p.get('avg_arrivals_per_hour', 10))
        # service
        self.avg_consult_minutes = float(self.p.get('avg_consult_minutes', 15))
        # scheduled vs walk-in
        self.pct_scheduled = float(self.p.get('pct_scheduled', 0.3))
        self.no_show_pct = float(self.p.get('no_show_pct', 0.05))

    def schedule_event(self, event):
        heapq.heappush(self.events, event)

    def generate_arrivals(self):
        # scheduled appointments per day
        expected_per_day = int(round(self.avg_arrivals_per_hour * (self.day_minutes/60.0)))
        scheduled_per_day = int(round(expected_per_day * self.pct_scheduled))
        # schedule scheduled appointments uniformly across the clinic day
        for d in range(self.sim_duration_days):
            day_offset = d * self.day_minutes
            for i in range(scheduled_per_day):
                t = day_offset + int((i+0.5) * (self.day_minutes / max(1, scheduled_per_day)))
                # apply no-show later when processing arrival
                self.schedule_event(Event(t, ARRIVAL, {'scheduled': True}))
        # unscheduled arrivals: Poisson process for remainder
        total_expected = self.avg_arrivals_per_hour * (self.day_minutes/60.0) * self.sim_duration_days
        unscheduled_expected = max(0, int(round(total_expected)) - scheduled_per_day*self.sim_duration_days)
        # generate via exponential interarrival
        t = 0
        while t < self.duration_minutes and unscheduled_expected>0:
            # rate per minute
            lam = max(1e-6, self.avg_arrivals_per_hour/60.0*(1-self.pct_scheduled))
            inter = random.expovariate(lam)
            t += max(1, int(round(inter)))
            if t < self.duration_minutes:
                self.schedule_event(Event(t, ARRIVAL, {'scheduled': False}))
                unscheduled_expected -= 1

    def schedule_doctor_breaks(self):
        # schedule one break per doctor per day at mid-day
        for d in range(self.sim_duration_days):
            day_offset = d * self.day_minutes
            break_start = day_offset + self.day_minutes//2
            for doc in range(self.num_doctors):
                self.schedule_event(Event(break_start, BREAK_START, {'doc': doc}))
                self.schedule_event(Event(break_start + self.doctor_break_minutes, BREAK_END, {'doc': doc}))

    def find_free_doctor(self, now):
        for i in range(self.num_doctors):
            if self.doctor_available[i] and self.doctor_busy_until[i] <= now:
                return i
        return None

    def run(self):
        self.generate_arrivals()
        self.schedule_doctor_breaks()
        # main loop
        while self.events:
            evt = heapq.heappop(self.events)
            now = evt.time
            et = evt.etype
            payload = evt.payload
            if et == ARRIVAL:
                # handle scheduled no-shows
                if payload.get('scheduled') and random.random() < self.no_show_pct:
                    continue
                # registration stage
                reg_complete_time = now + self.registration_minutes
                self.schedule_event(Event(reg_complete_time, REG_COMPLETE, {'arrival_time': now}))
            elif et == REG_COMPLETE:
                arrival_time = payload['arrival_time']
                # join doctor queue timestamp arrival_time
                self.doc_queue.append({'arrival_time': arrival_time, 'reg_complete': now})
                self.max_queue = max(self.max_queue, len(self.doc_queue))
                # try start service if doctor free
                doc = self.find_free_doctor(now)
                if doc is not None and self.doc_queue:
                    patient = self.doc_queue.popleft()
                    # start service
                    self.schedule_event(Event(now, SERVICE_START, {'doc': doc, 'patient': patient}))
            elif et == SERVICE_START:
                doc = payload['doc']
                patient = payload['patient']
                # assign doctor
                self.doctor_available[doc] = False
                service_time = int(round(self.avg_consult_minutes))
                end_time = now + service_time
                self.doctor_busy_until[doc] = end_time
                self.total_doctor_busy[doc] += service_time
                # record wait
                wait = now - patient['reg_complete']
                self.wait_times.append(wait)
                # schedule end
                self.schedule_event(Event(end_time, SERVICE_END, {'doc': doc, 'arrival_day': patient['arrival_time']//self.day_minutes}))
            elif et == SERVICE_END:
                doc = payload['doc']
                day = payload.get('arrival_day', 0)
                self.patients_seen_daily[day] += 1
                # mark doctor free
                self.doctor_available[doc] = True
                # if queue waiting, start next
                if self.doc_queue:
                    patient = self.doc_queue.popleft()
                    self.schedule_event(Event(now, SERVICE_START, {'doc': doc, 'patient': patient}))
            elif et == BREAK_START:
                doc = payload['doc']
                # mark doctor unavailable
                self.doctor_available[doc] = False
                # if doctor was in middle of service, we do NOT interrupt (breaks scheduled at idle in realistic, but keep simple)
            elif et == BREAK_END:
                doc = payload['doc']
                self.doctor_available[doc] = True
                # try to start service if queue
                if self.doc_queue:
                    patient = self.doc_queue.popleft()
                    self.schedule_event(Event(now, SERVICE_START, {'doc': doc, 'patient': patient}))
        # compute stats
        avg_wait = sum(self.wait_times)/len(self.wait_times) if self.wait_times else 0.0
        # doctor utilization percent per doctor over simulated minutes
        util_percents = []
        for i in range(self.num_doctors):
            util = self.total_doctor_busy[i] / (self.duration_minutes) if self.duration_minutes>0 else 0
            util_percents.append(util*100)
        doctor_util_percent = sum(util_percents)/len(util_percents) if util_percents else 0
        patients_seen_per_day = [self.patients_seen_daily[d] for d in range(self.sim_duration_days)]
        return {
            'avg_wait_minutes': round(avg_wait,1),
            'doctor_util_percent': round(doctor_util_percent,1),
            'patients_seen_per_day': patients_seen_per_day,
            'max_queue_length': int(self.max_queue)
        }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', help='input JSON file')
    parser.add_argument('--seed', type=int, default=None)
    args = parser.parse_args()
    params = read_input(args.input)
    sim = ClinicDES(params, seed=args.seed)
    out = sim.run()
    print(json.dumps(out, indent=2))

if __name__ == '__main__':
    main()
