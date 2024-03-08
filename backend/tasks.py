import logging
logger = logging.getLogger(__name__)

import neverbounce_sdk

from flask import current_app as app
from dateutil.tz import *
from dateutil.rrule import rrulestr
from flask.cli import with_appcontext
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import (
    desc, func, cast, or_, and_
)
from flask.cli import with_appcontext
from pprint import pprint

from zephony.models import db
from zephony.helpers import serialize_datetime, date_format, time_format

from backend.models.lead import Lead
from backend.rq_scheduler import queue
from backend.models.never_bounce_integration import NeverBounceIntegration

@with_appcontext
def get_client():
    client = neverbounce_sdk.client(api_key=app.config['NEVER_BOUNCE_API_KEY'])
    print('Never bounce client :', client)
    
    return client

@with_appcontext
def job_send_email(from_, to, subject, body):
    from backend.actions import LeadActions

    res = LeadActions.send_email_using_gmail_api(
        from_,
        to,
        subject,
        body,
    )
    return res

@with_appcontext
def send_leads_emails_to_never_bounce_for_validation_rq(emails=[]):
    client = get_client()

    info = client.account_info()
    print('Before credits info :', info)

    job = client.jobs_create(
        input=emails,
        auto_parse=True,
        auto_start=True,
        as_sample=True, # For Testing
    )
    print('job :', job)

    status_of_job = client.jobs_status(job_id=job['job_id'])
    print('status_of_job :', status_of_job)
    
    never_bounce_integration = NeverBounceIntegration({
        'request_payload': emails,
        'job_id': job['job_id'],
        'status': status_of_job['job_status'],
        'job_response_payload': job,
    })

    ################################################################

    # try:
    #     results_of_job = client.jobs_results(job_id=status_of_job['id'])
    #     print('results_of_job :', results_of_job)
    # except Exception as e:
    #     print('e 1 :', e)
    #     results_of_job = []
    # try:
    #     results_of_job = client.jobs_results(job_id=job['job_id'])
    #     print('results_of_job :', results_of_job)
    # except Exception as e:
    #     print('e 2 :', e)
    #     results_of_job = []

    # try:
    #     for each_result in results_of_job:
    #         print('each_result :', each_result)
    #         lead = Lead.query.filter(
    #             Lead.email == each_result.get('data', {}).get('email'),
    #             Lead.is_deleted == False,
    #         ).first()
    #         if not lead:
    #             continue
    #         lead.update({'email_status': each_result.get('verification', {}).get('result')})
    # except Exception as e:
    #     print('e 3 :', e)

    ##################################################################

    # jobs = client.jobs_search()
    # print('jobs :', jobs)
    # for each_job in jobs:
    #     try:
    #         print('each_job: ', each_job)
    #         results_of_job = client.jobs_results(job_id=each_job['id'])
    #         print('results_of_job :', results_of_job)

    #         for each_result in results_of_job:
    #             print('each_result :', each_result)
    #             lead = Lead.query.filter(
    #                 Lead.email == each_result.get('data', {}).get('email'),
    #                 Lead.is_deleted == False,
    #             ).first()
    #             if not lead:
    #                 continue
    #             lead.update({'email_status': each_result.get('verification', {}).get('result')})

    #     except Exception as e:
    #         print('e :', e)

    ################################################################

    db.session.commit()

    queue.enqueue(update_lead_email_status)

    info = client.account_info()
    print('After credits info :', info)

    return None

@with_appcontext
def update_lead_email_status():
    client = get_client()
    values=['complete']
    never_bounce_integrations = NeverBounceIntegration.query.filter(
        NeverBounceIntegration.is_deleted == False,
        NeverBounceIntegration.status.not_in(values),
    ).order_by(
        NeverBounceIntegration.created_at
    ).all()
    
    for each_job in never_bounce_integrations:
        try:
            status_of_job = client.jobs_status(job_id=each_job.job_id)
            print('status_of_job :', status_of_job)
    
            job_results = []
            if status_of_job.get('job_status') == 'complete':
                try:
                    # results_of_job = client.jobs_results(job_id=each_job.job_id)
                    results_of_job = client.jobs_results(job_id=status_of_job['id'])
                    print('results_of_job :', results_of_job)
                except Exception as e:
                    print('e :', e)
                    results_of_job = []

                for each_result in results_of_job:
                    print('each_result :', each_result)
                    data = {}
                    data["email"] = each_result.get('data', {}).get('email')
                    data["email_status"] = each_result.get('verification', {}).get('result')
                    
                    print('data :', data)
                    job_results.append(data)
                    
                    lead = None
                    if data['email']:
                        lead = Lead.query.filter(
                            Lead.email == data['email'],
                            Lead.is_deleted == False,
                        ).first()
                    
                    if lead:
                        lead.update({'email_status': each_result.get('verification', {}).get('result')})
                        print(f'Email status updated for Lead ID: {lead.id_}')

            # Check for data, if present add the data.
            job_data = {}
            if status_of_job.get('job_status'):
                job_data['status'] = status_of_job['job_status']
            if job_results:
                job_data['result_response_payload'] = {'results': job_results}
            
            # Update the record with status and payload
            if job_data:
                each_job.update(job_data)

        except Exception as e:
            print('There was an exception while')
            print('e :', e)

    db.session.commit()

    queue.enqueue_at(
        datetime.now() + timedelta(seconds=60),
        update_lead_email_status,
    )


