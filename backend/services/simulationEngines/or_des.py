#!/usr/bin/env python3
"""
ORDES - simplified OR scheduling DES. Reads JSON params and prints result JSON.
"""
import sys, json, heapq, argparse, random, math
from collections import deque, defaultdict

ARRIVAL = 'ARRIVAL'
CASE_START = 'CASE_START'
CASE_END = 'CASE_END'
TURNOVER_END = 'TURNOVER_END'

class Event:
    def __init__(self, time, etype, payload=None):
        self.time = time
        self.etype = etype
        self.payload = payload or {}
    def __lt__(self, other):
        return self.time < other.time

def read_input(path):
    with open(path) as f:
        return json.load(f)

class ORDES:
    def __init__(self, p, seed=None):
        self.p = p
        if seed is not None:
            random.seed(seed)
        self.num_ORs = int(p.get('num_ORs',2))
        self.num_surgeons = int(p.get('num_surgeons',3))
        self.scheduled_per_day = int(p.get('scheduled_cases_per_day',6))
        self.avg_emergencies_per_day = float(p.get('avg_emergencies_per_day',1))
        self.avg_surgery_minutes = int(p.get('avg_surgery_minutes',90))
        self.OR_turnover = int(p.get('OR_turnover_minutes',30))
        self.postop_minutes = int(p.get('postop_to_ward_minutes',60))
        self.work_minutes = int(p.get('work_minutes_per_day',8*60))
        self.sim_days = int(p.get('sim_duration_days',7))
        self.duration = self.sim_days * self.work_minutes
        self.events = []
        # OR state: next free time
        self.OR_busy_until = [0]*self.num_ORs
        self.or_occupied_time = [0]*self.num_ORs
        self.queue = deque() # scheduled then emergencies with priority
        self.scheduled_delays = []
        self.postponed = 0
        self.emergencies_handled = 0

    def schedule_event(self,e): heapq.heappush(self.events,e)

    def generate_cases(self):
        # scheduled uniformly across workday each day
        for d in range(self.sim_days):
            base = d*self.work_minutes
            for i in range(self.scheduled_per_day):
                # scheduled start time
                t = base + int((i+0.5)*(self.work_minutes/max(1,self.scheduled_per_day)))
                self.schedule_event(Event(t, ARRIVAL, {'type':'scheduled', 'scheduled_time':t}))
        # emergencies Poisson per day
        for d in range(self.sim_days):
            lam = self.avg_emergencies_per_day
            t = d*self.work_minutes
            # generate by counting
            num = random.poissonvariate(lam) if hasattr(random,'poissonvariate') else int(round(lam))
            # fallback: use Poisson approx by drawing from Poisson mean
            # simple: distribute uniformly across day using expovariate
            current = d*self.work_minutes
            while current < (d+1)*self.work_minutes:
                inter = random.expovariate(max(1e-6, lam/self.work_minutes))
                current += max(1, int(round(inter)))
                if current < (d+1)*self.work_minutes:
                    self.schedule_event(Event(current, ARRIVAL, {'type':'emergency'}))

    def find_free_or(self,now):
        for i in range(self.num_ORs):
            if self.OR_busy_until[i] <= now:
                return i
        return None

    def run(self):
        self.generate_cases()
        while self.events:
            evt = heapq.heappop(self.events)
            now = evt.time
            if evt.etype == ARRIVAL:
                typ = evt.payload.get('type')
                if typ == 'scheduled':
                    self.queue.append({'type':'scheduled','scheduled_time':evt.payload['scheduled_time'],'arrival':now})
                else:
                    # emergency inserted at front
                    self.queue.appendleft({'type':'emergency','arrival':now})
                # try assign ORs
                or_idx = self.find_free_or(now)
                while or_idx is not None and self.queue:
                    case = self.queue.popleft()
                    # start case now
                    # if scheduled and now > end of workday, postpone
                    day_end = (now//self.work_minutes + 1)*self.work_minutes
                    if case['type']=='scheduled' and now>=day_end:
                        self.postponed += 1
                        continue
                    duration = int(round(self.avg_surgery_minutes))
                    self.OR_busy_until[or_idx] = now + duration
                    self.or_occupied_time[or_idx] += duration
                    # schedule case end
                    self.schedule_event(Event(now+duration, CASE_END, {'or':or_idx,'case':case,'start':now}))
                    or_idx = self.find_free_or(now)
            elif evt.etype == CASE_END:
                or_idx = evt.payload['or']
                case = evt.payload['case']
                # after case, turnover
                turnover_end = now + self.OR_turnover
                self.OR_busy_until[or_idx] = turnover_end
                # add turnover end event which will free OR and attempt scheduling
                self.schedule_event(Event(turnover_end, TURNOVER_END, {'or':or_idx}))
                if case.get('type')=='emergency':
                    self.emergencies_handled += 1
                if case.get('type')=='scheduled':
                    delay = evt.payload['start'] - case.get('scheduled_time',evt.payload['start'])
                    self.scheduled_delays.append(max(0,delay))
            elif evt.etype == TURNOVER_END:
                or_idx = evt.payload['or']
                self.OR_busy_until[or_idx] = now
                # try schedule next case immediately
                if self.queue:
                    case = self.queue.popleft()
                    duration = int(round(self.avg_surgery_minutes))
                    self.OR_busy_until[or_idx] = now + duration
                    self.or_occupied_time[or_idx] += duration
                    self.schedule_event(Event(now+duration, CASE_END, {'or':or_idx,'case':case,'start':now}))
        # stats
        total_or_time = self.num_ORs * self.duration
        used = sum(self.or_occupied_time)
        OR_util_percent = round(100.0 * used / total_or_time,1) if total_or_time>0 else 0.0
        avg_start_delay = round(sum(self.scheduled_delays)/len(self.scheduled_delays),1) if self.scheduled_delays else 0.0
        return {'OR_util_percent':OR_util_percent,'avg_start_delay_minutes':avg_start_delay,'postponed_cases_count':self.postponed,'emergencies_handled':self.emergencies_handled}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input')
    parser.add_argument('--seed',type=int,default=None)
    args=parser.parse_args()
    p = read_input(args.input)
    sim = ORDES(p, seed=args.seed)
    out = sim.run()
    print(json.dumps(out,indent=2))

if __name__=='__main__':
    main()
