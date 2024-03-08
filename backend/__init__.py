import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

import sys
import sentry_sdk

from logging.config import dictConfig
from icecream import install
install()

from flask_cors import CORS
from sentry_sdk.integrations.flask import FlaskIntegration
from zephony.helpers import ApiFlask
from zephony.models import db

from backend.api import api, jwt, bcrypt
from backend.web import web_blueprint

# def initialize_translations(app):
#     try:
#         logger.info(' * Initializing translations messages...')
#         with app.app_context():
#             # Initializing translations
#             response_messages = {}
#             from backend.models.translation import Translation
#             translations = Translation.get_all()
#             for each_translation in translations:
#                 response_messages[each_translation.token] = {
#                     'en': each_translation.english_text
#                 }

#             app.config['translations'] = response_messages
#     except Exception as e:
#         logger.warning(f'e : {e}')
#         logger.warning('Problem while loading translations dictionary...')


def create_app(config_module):
    """
    This is the Flask factory method that creates the Flask app object.
    The app object can be created and used for testing, running the
    app locally or to run the app using an application server like
    Gunicorn or uWSGI.
    """

    from .configs.config import ContextFilter, APP_NAME

    # Setting up the app object
    app = ApiFlask(APP_NAME)

    # Import app specific configuration
    app.config.from_object(config_module)

    # Initializing the root logger
    dictConfig(app.config['LOGGING'])
    # Read: https://stackoverflow.com/questions/43109355/logging-setlevel-ignored
    logger.debug('Logger initialized')

    # Setting directories
    app.static_folder = 'static'

    db.init_app(app)

    try:
        if not any(
            each_element in ['rebuild', 'metadata-rebuild']
            for each_element in sys.argv
        ):
            # initialize_translations(app)
            pass
        else:
            logger.info(
                'Rebuild command detected hence not initializing translations...')
    except Exception as e:
        logger.warning(e)

    APP_ENV = app.config['APP_ENV']
    logger.info(f' * Current environment : {APP_ENV}')
    if not app.secret_key:
        logger.warning(
            f' * SECRET KEY is not present, in environment : {APP_ENV}')
    if APP_ENV and APP_ENV.lower() not in ('local', 'migrate'):
        logger.info(f' * Initialing SENTRY, environment : {APP_ENV}')
        sentry_sdk.init(
            dsn=app.config['SENTRY_DSN'],
            integrations=[
                FlaskIntegration(),
                # SqlalchemyIntegration(),
            ],
            environment=APP_ENV,
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            # We recommend adjusting this value in production.
            traces_sample_rate=1.0
        )

    from .seed import (
        rebuild,
        rebuild_permissions,
        build_new,
        build_newsletter_related,
    )
    app.cli.add_command(rebuild)
    app.cli.add_command(rebuild_permissions)
    app.cli.add_command(build_new)
    app.cli.add_command(build_newsletter_related)

    bcrypt.init_app(app)
    jwt.init_app(app)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register the blueprints here
    app.register_blueprint(web_blueprint)
    app.register_blueprint(api, url_prefix='/api/v1')

    return app

