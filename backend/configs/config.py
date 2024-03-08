import os
import random
import logging

logger = logging.getLogger(__name__)

# Custom filter to prepend log messages with a user identifier
# TODO Add proper context for log messages (user specific messages for better debugging)


class ContextFilter(logging.Filter):
    def filter(self, record):
        USERS = ['a', 'b', 'c']
        record.user = random.choice(USERS)
        return True

# Sentry dsn for entire project
SENTRY_DSN = ''#'https://8de275b6ca444084a8423735775b2746@o259394.ingest.sentry.io/4504752296951808'

# RQ Configs
DEFAULT_QUEUE = 'outreach'

APP_NAME = 'outreach'
# ENV = 'development'
# DEBUG = True
# DEBUG_TB_INTERCEPT_REDIRECTS = False
LOG_DIR = 'logs'
DATA_DIRECTORY = 'data'

# TODO: Should be changed in the server config for security
SECRET_KEY = 'fasdhbf@#$240Fa-234242'

# JWT specific configs
JWT_EXPIRES_IN_DAYS = 365

# OTP related configs
OTP_EXPIRES_IN_MINUTES = 2

# File upload stuff
UPLOAD_FOLDER = '/uploads/'

# Here for security purposes to not allow users to upload executables
IMAGE_ALLOWED_EXTENSIONS = ['jpg', 'png', 'jpeg', 'pdf'] # Images
FILE_ALLOWED_EXTENSIONS = ['csv']
MAX_CONTENT_LENGTH = 1024 * 1024 * 80  # 5 MB

# Never bounce API key
NEVER_BOUNCE_API_KEY = 'private_5046ceb563ff0b4ec7f6bcd8bba1bf36'
INSTANTLY_API_KEY = 'mgr4ddv3wp4670prg71mc9733szn'

# Define the following variables inside the dev_config.py file
# SQLALCHEMY_DATABASE_URI = 'postgresql://username:password@hostname/db'
# Server configuration file: server_config.py
# Live configuration file: live_config.py
# Staging configuration file: staging_config.py
# Developer specific configuration file: dev_config.py


# If set to True, Flask-SQLAlchemy will track modifications of objects and
# emit signals. The default is None, which enables tracking but issues a
# warning that it will be disabled by default in the future. This requires
# extra memory and should be disabled if not needed.
# TODO: See if this is still relevant
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Configuration for the python logging module
LOGGING = {
    'version': 1,
    'filters': {
        'contextFilter': {
            '()': ContextFilter
        }
    },
    'disable_existing_loggers': False,
    'root': {
        'level': logging.DEBUG,
        'handlers': ['console', 'file'],
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': logging.DEBUG,
            'formatter': 'detailed',
            'stream': 'ext://sys.stdout',
            # 'filters': ['contextFilter'],
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': logging.DEBUG,
            'formatter': 'detailed',
            'filename': LOG_DIR + '/' + APP_NAME.lower() + '.log',
            'mode': 'a',
            'maxBytes': 10485760,
            'backupCount': 5,
            # 'filters': ['contextFilter'],
        }
    },
    'formatters': {
        'detailed': {
            'format': ('%(asctime)s %(name)-17s line:%(lineno)-4d '
                       '%(levelname)-8s %(message)s')
        },
        'with_filter': {
            'format': ('%(asctime)s %(name)-17s line:%(lineno)-4d '
                       '%(levelname)-8s User: %(user)-35s %(message)s')
        },
    },
}

# Create logs directory if it doesn't exist.
# It typically wouldn't exist because it is ignored by git.
# Newly cloned repo won't have it.
LOG_FILENAME = LOG_DIR + '/' + APP_NAME.lower() + '.log'
if os.path.exists(LOG_FILENAME):
    logger.debug('Log file exists - using {}'.format(LOG_FILENAME))
else:
    try:
        os.makedirs(os.path.dirname(LOG_FILENAME), exist_ok=True)
    except OSError as e:
        logger.error("Unable to create log file at {}".format(LOG_FILENAME))
        logger.info("Error: {}".format(e))
    with open(LOG_FILENAME, 'w') as f:
        logger.info("Created new log file... {}".format(LOG_FILENAME))

# Server environment detected
# Value can be `dev` or `demo` or `live` or `beta`
if os.environ.get('APP_ENV'):
    APP_ENV = os.environ['APP_ENV'].lower().strip()
else:
    APP_ENV = None

# Based on APP_ENV variable, take the respective configuration file.
# if APP_ENV is None, take the dev_config file.
if APP_ENV:
    if APP_ENV == 'local':
        # Dev server configuration settings
        try:
            from .local_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from local_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'dev':
        # Dev server configuration settings
        try:
            from .dev_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from dev_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'migrate':
        # For migration from v1 to v2
        try:
            print('Importing from migrate config')
            from .migrate_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from migrate_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'demo':
        # Demo server configuration settings
        try:
            from .demo_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from demo_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'live':
        # Live server configuration settings
        try:
            from .live_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from live_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'beta':
        # Beta server configuration settings
        try:
            from .beta_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from beta_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'test':
        # Test server configuration settings
        try:
            from .test_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from test_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'test_frontend':
        # Beta server configuration settings
        try:
            from .test_frontend_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from test_frontend_config.py.'
                ' File not found'
            )
    elif APP_ENV == 'test_backend':
        # Beta server configuration settings
        try:
            from .test_backend_config import *
        except ImportError:
            logger.warning(
                'Not importing configuration settings from test_backend_config.py.'
                ' File not found'
            )
    else:
        logger.warning(
            'APP_ENV is unknown'
        )

else:
    # Local environment detected
    # Try importing from the local_config.py file
    try:
        from .local_config import *
    except ImportError:
        logger.warning(
            'Not importing configuration settings from local_config.py.'
            ' File not found'
        )

# To be used only when using docker
if os.environ.get('POSTGRES_URL'):
    SQLALCHEMY_DATABASE_URI = os.environ.get('POSTGRES_URL')

# After importing the respective environment config files
# Load the secret key.
try:
    SECRET_KEY = SECRET_KEY
except Exception as e:
    SECRET_KEY = None
    logger.debug(e)
