"""Background jobs for the web UI (imports, ingests, indexing).

Jobs run one at a time on a worker thread, each with its own database
connection, so the site stays responsive while a film is being processed.
"""

import itertools
import queue
import threading
import time
import traceback

from . import db


class Job:
    _ids = itertools.count(1)

    def __init__(self, kind, title, fn):
        self.id = next(self._ids)
        self.kind, self.title, self.fn = kind, title, fn
        self.status = "queued"        # queued -> running -> done | failed
        self.stage = ""
        self.progress = 0.0
        self.lines = []
        self.result = None
        self.created = time.time()
        self.finished = None

    def log(self, *parts):
        msg = " ".join(str(p) for p in parts).strip()
        if msg:
            self.lines = (self.lines + [msg])[-40:]

    def set_progress(self, stage, fraction):
        self.stage, self.progress = stage, max(0.0, min(1.0, float(fraction)))

    def to_dict(self):
        return {"id": self.id, "kind": self.kind, "title": self.title, "status": self.status,
                "stage": self.stage, "progress": round(self.progress, 3),
                "message": self.lines[-1] if self.lines else "", "log": self.lines[-8:],
                "result": self.result, "created": self.created, "finished": self.finished}


class JobQueue:
    def __init__(self, lib):
        self.lib = lib
        self.jobs = []
        self.queue = queue.Queue()
        self.lock = threading.Lock()
        self.worker = threading.Thread(target=self._run, name="stillroom-jobs", daemon=True)
        self.worker.start()

    def submit(self, kind, title, fn):
        """fn(job, conn) does the work; whatever it returns becomes job.result."""
        job = Job(kind, title, fn)
        with self.lock:
            self.jobs.append(job)
            self.jobs = self.jobs[-100:]
        self.queue.put(job)
        return job

    def list(self):
        with self.lock:
            return [j.to_dict() for j in reversed(self.jobs)]

    def active(self):
        with self.lock:
            return any(j.status in ("queued", "running") for j in self.jobs)

    def _run(self):
        while True:
            job = self.queue.get()
            job.status = "running"
            conn = db.connect(self.lib.db_path)
            try:
                job.result = job.fn(job, conn)
                job.status = "done"
                job.progress = 1.0
            except Exception as e:
                job.status = "failed"
                job.log(f"Failed: {type(e).__name__}: {e}")
                traceback.print_exc()
            finally:
                job.finished = time.time()
                conn.close()
