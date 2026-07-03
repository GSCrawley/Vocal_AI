# app/worker.py
import redis
from rq import Worker, Queue
from app.config import settings

redis_conn = redis.from_url(settings.redis_url)
queues = [
    Queue("vocal_separation", connection=redis_conn),
    Queue("vocal_analysis",   connection=redis_conn),
    Queue("singing_metrics",  connection=redis_conn),
    Queue("filler_detection", connection=redis_conn),
    Queue("karaoke_compare",  connection=redis_conn),
    Queue("baseline_assessment", connection=redis_conn),
]

# Pre-warm demucs model before worker starts
import demucs.separate

if __name__ == "__main__":
    worker = Worker(queues, connection=redis_conn)
    worker.work()