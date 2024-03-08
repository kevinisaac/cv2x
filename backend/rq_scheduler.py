import os

from redis import Redis
from rq import Queue
from rq_scheduler import Scheduler

from backend.configs.config import DEFAULT_QUEUE

# Redis queue initialization
if os.environ.get('REDIS_HOST'):
    redis_connection = Redis(os.environ['REDIS_HOST'])
else:
    redis_connection = Redis()

queue = Queue(DEFAULT_QUEUE, connection=redis_connection)
scheduler = Scheduler(queue=queue, connection=queue.connection)

