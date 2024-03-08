# Logging
import logging
logger = logging.getLogger(__name__)

import os

from datetime import datetime
from flask import (
    redirect,
    request,
    url_for,
    Response,
    Blueprint,
    render_template,
    current_app as app,
    send_from_directory,
)

from zephony.models import db
from zephony.exceptions import ResourceNotFound
from zephony.helpers import (
    datetime_format,
    serialize_datetime,
)

from backend.models.lead import Lead
from backend.models.lead_activity import LeadActivity

web_blueprint = Blueprint('web', __name__, template_folder='../../templates')

# Serve React App
# TODO: Inspect for security - shouldn't serve the source files
@web_blueprint.route('/', defaults={'path': ''})
@web_blueprint.route('/<path:path>')
def serve(path):
    request.user = None
    UPLOAD_FOLDER = app.config['UPLOAD_FOLDER'][1:-1]
    if path.startswith(UPLOAD_FOLDER):
        try:
            actual_file = send_from_directory(
                os.getcwd(),
                path,
            )
        except Exception as e:
            logger.warning(f'e : {e}')
            actual_file = None
            raise ResourceNotFound(
                message='Invalid file path'
            )
        return actual_file
    elif path.startswith('email_open_image'):
        params = request.args.to_dict()
        if 'id_lead' in params and params['id_lead'] and params['id_lead'].isdigit():
            lead = Lead.get_one(int(params['id_lead']), with_organization=False)
            if lead:
                lead_email_opened = LeadActivity({
                    'type_': 'open',
                    'id_lead': params['id_lead'],
                    'headers': dict(request.headers),
                    'activity_time': serialize_datetime(datetime.now(), datetime_format),
                })
                db.session.commit()
        return send_from_directory(
            os.getcwd(),
            'email_open_image.jpg',
        )
    return send_from_directory('templates/', 'index.html')

@web_blueprint.route('/gmail-auth-callback', methods=['GET', 'POST'])
def gmail_auth_callback():
    if request.method == 'GET':
        return f'GET: {request.args.get("code")}'
    elif request.method == 'POST':
        return 'POST'

