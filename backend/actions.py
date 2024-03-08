import os
import re
import csv
import time
import copy
import json
import uuid
import base64
import pickle
import random
import string
import logging
import neverbounce_sdk
import requests

from rq import cancel_job
from rq.registry import StartedJobRegistry, CanceledJobRegistry
from zoneinfo import ZoneInfo
from collections import namedtuple
from datetime import date, datetime, timedelta
from dateutil.tz import *
from dateutil.rrule import *
from dateutil.relativedelta import *
from flask import request, current_app as app, send_from_directory
from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy import desc, func, cast, or_, and_, nullslast
from sqlalchemy.orm import aliased
from sqlalchemy.dialects import postgresql
from werkzeug.utils import secure_filename
from datetime import datetime
from urllib.parse import quote, unquote, urlparse, parse_qs
from jinja2 import Environment, BaseLoader

from backend.rq_scheduler import queue, scheduler, redis_connection

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.mime.text import MIMEText

from zephony.helpers import (
    tokenify,
    send_email,
    date_format,
    time_format,
    is_valid_date,
    normalize_date,
    datetime_format,
    serialize_datetime,
    get_rows_from_csv,
    convert_datetime_to_utc,
    random_string_generator,
    generate_checksum_of_file,
    get_rows_from_workbook_sheet,
    get_customized_response_message,
    datetime_with_microseconds_format,
)
from zephony.exceptions import (
    ServerError,
    ObjectNotFound,
    AccessForbidden,
    ResourceNotFound,
    InvalidRequestData,
    UnauthorizedAccess,
    NonUpdatableFields,
    InvalidDateTimeError,
)
from zephony.models import db

from backend.models import *
from backend.json_data import json_data
from backend.tasks import (
    job_send_email,
    send_leads_emails_to_never_bounce_for_validation_rq,
)
from backend.rq_scheduler import queue, scheduler
from backend.json_data import json_data

logger = logging.getLogger(__name__)


class FileActions():
    """
    This class performs all actions related to storing of files,
    and getting details of each files.
    """

    def create(files, config, custom_file_name):
        """
        This method creates a stores a file in the database,
        and adds the user details based on the token.
        Returns : List
        """

        errors = []

        # Validate
        if not files:
            raise InvalidRequestData(
                errors=None,
                message='No file selected'
            )

        for file_ in files:
            filename = secure_filename(file_.filename)
            ext = filename.split('.')[-1]

            if ext not in config['ALLOWED_EXTENSIONS']:
                raise InvalidRequestData(
                    errors=None,
                    message=f"Allowed extensions are {str(config['ALLOWED_EXTENSIONS']).strip('[]')}"
                )

        if errors:
            raise InvalidRequestData(errors)

        files_details = []
        for file_ in files:
            f = FileActions.upload_file(file_, upload_type='file', config=config, custom_file_name=custom_file_name)

            # Set the sender id based on the user type of JWT
            if request and request.user and request.user.id_:
                f['id_user'] = request.user.id_
            else:
                f['id_user'] = None

            # 1. Create the model/row in the database
            file_obj = File(f)
            db.session.commit()

            logger.info("File {} created.".format(file_obj.id_))
            files_details.append(file_obj.get_details())

        return files_details

    def get(id_):
        """
        Method used to get the file details by id.
        Returns : Dict
        """

        file_filters = {
            'id_': id_,
            'is_deleted': False
        }

        file_ = File.filter_objects_by_keywords(
            filters=file_filters,
            first_one=True,
        )

        if not file_:
            raise ResourceNotFound

        return file_.get_details()

    def upload_file(file_, upload_type='image', config=None, custom_file_name=None):
        """
        This function handles uploading of a file, getting the file object -
        typically returned by the Flask request handler.

        :param file file_: The file object that has to be saved

        :return str: The path of the saved file
        """

        upload_folder = config['FILE_UPLOAD_FOLDER']

        # Add timestamp to filename to avoid image replacement due to name
        # duplication
        timestamp = str(int(round(time.time() * 1000000)))
        filename = secure_filename(file_.filename)
        extension = filename.split('.')[-1]
        filename = '{}.{}'.format(custom_file_name or timestamp, extension)

        # Actual file path where the file is saved
        file_path = f'{app.root_path}{upload_folder}' + filename
        file_.save(file_path)

        # Reconstruct the file path after saving the file
        f_path = f'{upload_folder}' + filename

        return {
            'original_name': file_.filename,
            'name': filename,
            'type_': extension,
            'path': f_path
        }


class AuthActions():
    """
    Authentication related functionality go in here.
    """

    def _generate_access_token(user):
        """
        Method to generate access token for a user
        """

        # Set the configured expiration for JWT access token
        token_expires_at = timedelta(days=app.config['JWT_EXPIRES_IN_DAYS'])
        access_token = create_access_token(
            user, expires_delta=token_expires_at)

        return access_token

    def login_with_password(data):
        """
        Method to login the user with password
        Returns : Dict
        """

        user = User.query.filter(
            User.email == data['email'].lower(),
            User.is_deleted == False,
        ).first()

        if not user:
            errors = [{
                'field': 'data.email',
                'description': 'Incorrect email'
            }]
            raise InvalidRequestData(errors)

        if not user.password:
            errors = [{
                'field': 'data.password',
                'description': 'Please set your new password'
                ' via link sent to email, before trying to login'
            }]
            raise InvalidRequestData(errors)

        if not user.check_password(data['password']):
            errors = [{
                'field': 'data.password',
                'description': 'Incorrect password. Please try again.'
            }]
            raise InvalidRequestData(errors)

        if user.status != json_data['user_statuses']['active']:
            raise InvalidRequestData(
                message='Please contact admin to continue using the Outreach.'
            )

        # If no error is raised login the user and
        # generate a JWT access token for the user.
        access_token = AuthActions._generate_access_token(user)

        user.last_login_at = serialize_datetime(
            datetime.now(),
            datetime_format
        )

        # Fetch the user details
        user_details = user.get_details()

        # Construct the response
        response = {
            'access_token': access_token,
            **user_details
        }

        return response

    def send_password_reset_link(data):
        """
        Action method to send a password reset link for the given user.
        The user is identified by the given user email.
        If there is already an unexpired password reset link, overwrite it.
        Returns : String
        """

        errors = []

        user = User.filter_objects_by_keywords(
            {'email': data['email'].lower()},
            first_one=True,
        )
        if not user:
            errors.append({
                'field': 'data.email',
                'description': 'No user found with the email'
            })

        if user and user.status != json_data['user_statuses']['active']:
            raise InvalidRequestData(
                errors=[{
                    'field': 'data.email',
                    'description': 'User status is not acitve'
                }],
                message='You can reset the password,'
                ' only if the status of the user is active.'
            )

        if errors:
            raise InvalidRequestData(errors)

        # Create new password reset link
        new_password_reset_data = {
            'password_reset_link_expires_at': serialize_datetime(
                datetime.now() + timedelta(days=1),
                datetime_format
            ),
            'password_reset_token': ''.join(random.choices(string.ascii_letters, k=10)),
        }
        CommonActions.log_info_if_not_live(
            'Send email to password reset : ',
            new_password_reset_data
        )
        user.update(new_password_reset_data)

        template_data = {
            'host_url': request.host_url,
            'link': '{}reset-password?email={}&password_reset_token={}'.format(
                request.host_url,
                user.email,
                user.password_reset_token,
            ),
            'user_details': user.get_details(),
            'password_reset_token': new_password_reset_data['password_reset_token'],
            'encoded_email' : UserActions.encode_email(user.email),
        }

        template = 'password_reset_email.html'

        res = CommonActions.send_email_to(
            email=user.email,
            subject='Password reset has been requested',
            template_string=None,
            template=template,
            template_data=template_data,
        )

        CommonActions.log_info_if_not_live(
            'Mailgun response for password reset : ',
            res
        )

        return 'You can reset your password, with the link provided in the Email Inbox'

    def reset_password(data):
        """
        Action method to reset the password using the email and token from the
        password reset link.
        Returns : String
        """

        errors = []
        user = User.filter_objects_by_keywords(
            {
                'email': data['email'].lower(),
                # 'status': json_data['user_statuses']['active'],
                # 'password_reset_token': data['password_reset_token'],
            },
            first_one=True
        )
        if not user:
            errors.append({
                'field': 'data.email',
                'description': 'Invalid email ID.'
            })
            raise InvalidRequestData(
                errors,
                message='Email not found, Please check the email ID.'
            )

        if user.status != json_data['user_statuses']['active']:
            raise InvalidRequestData(
                message='Please contact admin, as the user status is not active.'
            )

        if user.password_reset_token != data['password_reset_token']:
            raise InvalidRequestData(
                message='Invalid link, please use the link on most recent email.'
            )

        if user.password_reset_link_expires_at and\
                user.password_reset_link_expires_at < datetime.now():
            raise InvalidRequestData(
                message='The password reset flow has be completed within 24 hours, Please try again.'
            )

        new_password_data = {
            'new_password': data['password'],
            'password_reset_token': None,
            'password_reset_link_expires_at': None,
        }

        user.update(new_password_data)

        return 'Your password has been reset successfuly'

    def set_password(data):
        """
        Action method to set the password using the email and token from the
        password set link.
        Returns : String
        """

        errors = []
        user = User.filter_objects_by_keywords(
            {'email': data['email'].lower()},
            first_one=True
        )
        if not user:
            raise InvalidRequestData(
                errors=[{
                    'field': 'data.email',
                    'description': 'Invalid email ID.'
                }],
                message='Invalid email ID, please contact the administrator.'
            )

        if user.password_set_token != data['password_set_token']:
            raise InvalidRequestData(
                message='Invalid link for signing up or signup process has already been completed.'
            )

        if user.password_set_link_expires_at and\
                user.password_set_link_expires_at < datetime.now():
            raise InvalidRequestData(
                message='Signup process has to be completed within 24 hours, Please admin to resend the invitation.'
            )

        password_data = {
            'password': data['password'],
            'status': json_data['user_statuses']['active'],
            'password_set_token' : None,
            'password_set_link_expires_at': None,
            'is_email_verified': True,
            'datetime_joined_at' : serialize_datetime(datetime.now(tzutc()), datetime_format),
        }

        user.update(password_data)

        return 'Your password has been set successfully'

    def resend_invite(data):
        """
        Method create and sends a new sign-up invitation to the user via Email.
        Returns : String
        """
        errors = []
        user = User.filter_objects_by_keywords(
            {'email': data['email'].lower()},
            first_one=True
        )
        if not user:
            errors.append({
                'field': 'data.email',
                'description': 'Invalid email ID.'
            })
            raise InvalidRequestData(
                errors,
                message='Email not found, Please check the email ID.'
            )

        if user.password:
            raise InvalidRequestData(
                errors,
                message='Password has already been set, please use reset password or set password to set a password'
            )

        if errors:
            raise InvalidRequestData()

        previous_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        # Creates a new random strings and set to the token.
        resend_user_invite_data = {
            'password_set_link_expires_at': serialize_datetime(
                datetime.now() + timedelta(days=1),
                datetime_format
            ),
            'password_set_token': ''.join(random.choices(string.ascii_letters, k=10)),
        }
        user.update(resend_user_invite_data)

        CommonActions.log_info_if_not_live(
            'Resend user invite : ',
            resend_user_invite_data
        )

        template_data = {
            'host_url': request.host_url,
            'user_details': user.get_details(),
            'encoded_email' : UserActions.encode_email(user.email),
            'password_set_token': resend_user_invite_data['password_set_token'],
        }

        template = 'activation_email.html'

        res = CommonActions.send_email_to(
            email=user.email,
            subject='Invitation to join Outreach',
            template_string=None,
            template=template,
            template_data=template_data,
        )

        CommonActions.log_info_if_not_live(
            'Mailgun response for Resend user invite : ',
            res
        )

        current_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        return 'Invited successfully'

    def send_invite(data):
        """
        Method create and sends a new sign-up invitation to the user via Email.
        Returns : String
        """
        errors = []
        user = User.filter_objects_by_keywords(
            {'email': data['email'].lower()},
            first_one=True
        )
        if not user:
            errors.append({
                'field': 'data.email',
                'description': 'Invalid email ID.'
            })
            raise InvalidRequestData(
                errors,
                message='Email not found, Please check the email ID.'
            )

        if errors:
            raise InvalidRequestData(errors)

        # Creates a new random strings and set to the token.
        send_user_invite_data = {
            'password_set_link_expires_at': serialize_datetime(
                datetime.now() + timedelta(days=1),
                datetime_format
            ),
            'password_set_token': ''.join(random.choices(string.ascii_letters, k=10)),
        }
        user.update(send_user_invite_data)

        CommonActions.log_info_if_not_live(
            'Send/Resend user invite : ',
            send_user_invite_data
        )

        template_data = {
            'host_url': request.host_url,
            'user_details': user.get_details(),
            'encoded_email' : UserActions.encode_email(user.email),
            'password_set_token': send_user_invite_data['password_set_token'],
        }

        template = 'activation_email.html'

        res = CommonActions.send_email_to(
            email=user.email,
            subject='Invitation to join Outreach',
            template_string=None,
            template=template,
            template_data=template_data,
        )

        CommonActions.log_info_if_not_live(
            'Mailgun response for Send user invite : ',
            res
        )

        return 'Invited successfully'


class MyAccountActions():
    def get(id_):
        """
        Method used to get details of current user, based on JWT.
        Returns : Dict
        """
        user = User.get_one(id_, with_organization=False)
        user_details = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        user_details['permissions_map'] = user.get_permissions_map()

        return user_details

    def update(id_, data):
        """
        Method used to update details of current user, based on JWT.
        TODO: If required to separate update for current user, it has to be moved here.
        Returns : Dict
        """
        errors = []
        errors = UserActions.user_data_validation(
            data=data,
            errors=errors,
            id_=id_,
        )

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        previous_version = UserActions.get_users_details(
            params={'id_': f'{request.user.id_}'}
        )[0]

        UserActions.update(
            data=data,
            id_=request.user.id_,
        )

        current_version = UserActions.get_users_details(
            params={'id_': f'{request.user.id_}'}
        )[0]

        return current_version

    def validate_password(data):
        """
        This method is used to validate password of the current user.
        USECASE : In setting page, to update of email/password this method is used to unlock it.
        Returns : Boolean
        """
        if not request.user.check_password(data['password']):
            errors = [{
                'field': 'data.password',
                'description': 'Incorrect password. Please try again.'
            }]
            raise InvalidRequestData(
                errors,
                message='Incorrect password'
            )

        return True

    def change_email_or_password(data):
        """
        After unlocking with current password, this method takes care of
        validating the user details(new email or/and password).
        Fields =>
            Required => current password
            Optional => new email or/and new password )
        If new password is present,
            generate new hash for new password and replace the current password.
        If new email is present,
            send confirmation email to new email and notification email to old email.
        Returns : Dict
        """
        errors = []
        if not request.user.check_password(data['password']):
            errors.append({
                'field': 'data.password',
                'description': 'Incorrect password. Please try again.'
            })
            raise InvalidRequestData(
                errors,
                message='Incorrect password'
            )
        if 'new_email' in data and data['new_email']:
            # Check if the email is valid
            check_if_email_alreay_exist = User.query.filter(
                or_(
                    User.email == data['new_email'].lower(),
                    User.new_email == data['new_email'].lower(),
                ),
                User.is_deleted == False
            ).first()
            if check_if_email_alreay_exist:
                errors.append({
                    'field': 'data.new_email',
                    'description': 'Email is already in use',
                })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            if data.get('new_email'):
                response_message = get_customized_response_message(
                    'message.error.update.settings.emailid.general'
                )
            else:
                response_message = 'Error while updating your password'
            raise InvalidRequestData(
                errors,
                message=response_message
            )

        if 'new_email' in data and data['new_email']:
            # Add token and expiry datetime to data for user Model update.
            data['new_email_verification_token'] = random_string_generator(20)
            data['new_email_token_expires_at'] = serialize_datetime(
                datetime.now() + timedelta(days=1),
                datetime_with_microseconds_format
            )
            new_email_template_data = {
                'host_url': request.host_url,
                'new_email': data['new_email'].lower(),
                'user_details': request.user.get_details(),
                'new_email_verification_token': data['new_email_verification_token'],
                'encoded_new_email' : UserActions.encode_email(data['new_email']),
            }
            old_email_template_data = {
                'email': request.user.email,
                'new_email': data['new_email'].lower(),
                'user_details': request.user.get_details(),
                'encoded_old_email' : UserActions.encode_email(request.user.email),
                'encoded_new_email' : UserActions.encode_email(data['new_email']),
            }

            CommonActions.log_info_if_not_live(
                'New email verification token : ',
                data['new_email_verification_token']
            )

            # Send confirmation to new mail
            new_email_response = CommonActions.send_email_to(
                email=data['new_email'],
                subject='Request for change of email',
                template_string=None,
                template='new_email_id_verification_email.html',
                template_data=new_email_template_data,
            )

            CommonActions.log_info_if_not_live(
                f'Mailgun response for new email change sent to {data["new_email"]} : ',
                new_email_response
            )

            # Send notification to old mail
            old_email_response = CommonActions.send_email_to(
                email=request.user.email,
                subject='Notification from Outreach',
                template_string=None,
                template='old_email_id_intimation_email.html',
                template_data=old_email_template_data,
            )

            CommonActions.log_info_if_not_live(
                f'Mailgun response to notify old email sent to {request.user.email} : ',
                old_email_response
            )

        # UserActions.update(
        #     data=data,
        #     id_=request.user.id_,
        # )

        request.user.update(data)

        return UserActions.get_users_details(
            params={'id_': f'{request.user.id_}'}
        )[0]

    def confirm_new_email(data):
        """
        This method verifies new email along with the token,
        and replaces the existing email with new email.
        Returns : Boolean
        """

        errors = []
        new_email_user = User.filter_objects_by_keywords(
            {'new_email': data['new_email'].lower()},
            first_one=True
        )

        if not new_email_user:
            errors.append({
                'field': 'data.new_email',
                'description': 'Invalid email',
            })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        if new_email_user.new_email_verification_token != data['new_email_verification_token']:
            raise InvalidRequestData(
                message='Invalid verification link or link has expired.'
            )

        if serialize_datetime(
            datetime.now(), datetime_with_microseconds_format
        ) > serialize_datetime(
            new_email_user.new_email_token_expires_at, datetime_with_microseconds_format
        ):
            raise InvalidRequestData(
                message='Email updation process should be completed within 24 hours, Please request email change again.'
            )

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors,
                message=get_customized_response_message(
                    'message.error.update.settings.emailid.general'
                )
            )

        new_data = {
            'email': data['new_email'].lower(),
            'is_email_verified': True,
            'new_email': None,
        }

        new_email_user.update(new_data)

        return True


class UserActions():
    def get_users_details(params={}):
        """
        This method gets all users and their associated details.
        Returns Type : List
        """
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': User.id_,
            'name': User.name,
            'email': User.email,
            'id_role': User.id_role,
            'username': User.username,
            'is_staff': User.is_staff,
            'is_admin': User.is_admin,
            'datetime_joined_at': User.datetime_joined_at,
            'status': User.status,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (Role, Role.id_, User.id_role),
            (File, File.id_, User.id_profile_picture),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = User.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
        )

        # TODO: Add custom filtering, if any
        if 'q' in params and params['q']:
            or_filters = []
            filter_string = '%'
            for each_char in params['q']:
                filter_string = filter_string + each_char + '%'

            or_filters.append(
                User.name.ilike(filter_string)
            )
            or_filters.append(
                Role.name.ilike(filter_string)
            )

            if or_filters:
                q = q.filter(
                    or_(*tuple(or_filters))
                )

        if 'order_by' not in params:
            q = q.order_by(
                nullslast(
                    User.last_updated_at.desc()
                )
            )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = User.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        users_details = []
        for result in results:
            user_details = result.User.get_details()
            user_details['role_details'] = result.Role.get_details()\
                if result.Role else {}
            user_details['profile_picture_details'] = result.File.get_details()\
                if result.File else {}
            users_details.append(user_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return User.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=users_details,
            )

        return users_details

    def user_data_validation(data, errors=[], id_=None):
        """
        All user data validation for post and patch request is done here.
        Returns : List
        """

        if 'email' in data and data['email']:
            # Check if the email is valid
            user_email = User.query.filter(
                or_(
                    User.email == data['email'].lower(),
                    User.new_email == data['email'].lower(),
                ),
                User.is_deleted == False
            ).first()
            if user_email and (not id_ or id_ != user_email.id_):
                errors.append({
                    'field': 'data.email',
                    'description': 'Email is already in use',
                })

        if 'id_role' in data:
            role = Role.get_one(data['id_role'])
            if not role:
                errors.append({
                    'field': f'data.id_role',
                    'description': 'Not a valid Role.'
                })

        if 'id_profile_picture' in data and data['id_profile_picture']:
            file_ = File.get_one(data['id_profile_picture'])
            if not file_:
                errors.append({
                    'field': f'data.id_profile_picture',
                    'description': 'Not a valid profile picture.'
                })

        return errors

    def encode_email(email):
        return quote(email)

    def create(data):
        """
        Method creates a new user with the data.
        Returns : Dict
        """

        errors = []

        errors = UserActions.user_data_validation(
            data=data,
            errors=errors,
        )

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        if request and request.user and request.user.id_organization:
            data['id_organization'] = request.user.id_organization

        # Create the row in the database
        user = User(data)

        # Create a username based on the email and combine with user id
        user.username = ''.join(
            f"{data['email'].lower().split('@')[0]}{user.id_}"
        )

        # send invitation to set password
        AuthActions.send_invite(data)

        current_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        return current_version

    def get_all(params={}):
        """
        Get all users details, based on the params.
        Params : Dict
        Returns : List
        """

        return UserActions.get_users_details(params=params)


    def get(id_):
        """
        Get details for the specific user and associated details.
        Returns : Dict
        """

        user = User.get_one(id_, with_organization=False)
        if not user:
            raise ResourceNotFound

        current_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        return current_version

    def update(id_, data):
        """
        Update the data for the specific user based on the data.
        Returns : Dict
        """

        user = User.get_one(id_, with_organization=False)
        if not user:
            raise ResourceNotFound

        status_of_user = copy.deepcopy(user.status)
        old_email = None
        if user.email:
            old_email = copy.deepcopy(user.email.lower())

        errors = []

        errors = UserActions.user_data_validation(
            data=data,
            errors=errors,
            id_=user.id_
        )

        if request.user and request.user.is_admin:
            if 'email' in data and data['email']:
                if request.user.id_ == user.id_:
                    errors.append({
                        'field': 'data.email',
                        'description': 'To change your email go to Profile => Security'
                    })
                elif user.is_email_verified:
                    errors.append({
                        'field': 'data.email',
                        'description': 'Email is already verified, only the respective user can change the Email'
                    })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        previous_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        if 'status' in data and data['status']:
            if not user.is_email_verified and data['status'] == 'active':
                data['status'] = 'invited'

            if data['status'] == 'deactivated':
                data['password_set_token'] = None
                data['password_set_link_expires_at'] = None

        # Changing the role of user from custom to admin.
        if 'is_admin' in data and data['is_admin'] and user.id_role:
            user.id_role = None
        # Changing the role of user from admin to custom.
        elif 'id_role' in data and data['id_role'] and user.is_admin:
            user.is_admin = False

        user.update(data)

        if 'status' in data and data['status'] and\
                not user.is_email_verified and data['status'] == 'active':
            AuthActions.resend_invite({'email': user.email})
        elif 'email' in data and old_email and old_email != data['email'].lower():
            AuthActions.resend_invite({'email': data['email'].lower()})

        current_version = UserActions.get_users_details(
            params={'id_': f'{user.id_}'}
        )[0]

        return current_version


class SpecializationActions():
    """
    Actions to handle Company Type module
    """
    def get_specializations_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Specialization.id_,

        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Specialization.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        specializations_details = []
        for result in results:
            specialization_details = result.Specialization.get_details()
            specializations_details.append(specialization_details)

        return specializations_details

    def specialization_data_validation(data, errors):
        return errors

    def create(data):
        errors = []
        errors = SpecializationActions.specialization_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        specialization = Specialization(data)

        params = {
            'id_': str(specialization.id_)
        }

        return SpecializationActions.get_specializations_details(params=params)

    def get_all(params={}):
        return SpecializationActions.get_specializations_details(params=params)

    def get(id_):
        specialization = Specialization.get_one(id_, with_organization=False)

        if not specialization:
            raise ResourceNotFound

        params = {
            'id_': str(specialization.id_)
        }

        return SpecializationActions.get_specializations_details(params=params)

    def update(id_, data):
        specialization = Specialization.get_one(id_, with_organization=False)

        if not specialization:
            raise ResourceNotFound

        errors = []
        errors = SpecializationActions.specialization_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        specialization.update(data)

        params = {
            'id_': str(specialization.id_)
        }

        return SpecializationActions.get_specializations_details(params=params)

    def delete(id_):
        specialization = Specialization.get_one(id_, with_organization=False)

        if not specialization:
            raise ResourceNotFound

        specialization.soft_delete()

        return None


class PermissionActions():
    def get_all(params):
        """
        Method gets all permissions and it's dependent details.
        Returns : List
        """
        permissions = Permission.get_all()
        permissions_details = []
        for permission in permissions:
            if not permission.dependent_permissions_bit_sequence:
                permissions_details.append(
                    {
                        **permission.get_details(),
                        'dependent_details': []
                    }
                )
            else:
                permission_details = {
                    **permission.get_details(),
                    'dependent_details': []
                }
                for each_permission in permissions:
                    if int(each_permission.permission_bit) & int(
                        permission.dependent_permissions_bit_sequence
                    ):
                        permission_details['dependent_details'].append(
                            each_permission.get_details()
                        )
                permissions_details.append(
                    permission_details
                )

        return permissions_details


class RoleActions():
    def permission_dependency_validation(permission_bit_sequence, errors):
        """
        Method validates for each permission, dependency permission bits are also selected,
        Else raises error is added and returned.
        Returns : List
        """
        permissions = Permission.get_all()
        dependent_permissions = Permission.query.filter(
            Permission.dependent_permissions_bit_sequence != None
        ).all()
        permission_dict = {}
        for each_permission in dependent_permissions:
            permission_dict[int(each_permission.permission_bit)] = [
                int(permission.permission_bit)
                for permission in permissions
                if int(permission.permission_bit) & int(each_permission.dependent_permissions_bit_sequence)
            ]
        # pprint(permission_dict)
        permission_bit_sequence_number = int(permission_bit_sequence)
        for permission, list_of_dependent_permissions in permission_dict.items():
            if permission_bit_sequence_number & permission:
                for each_permission in list_of_dependent_permissions:
                    if not permission_bit_sequence_number & each_permission:
                        errors.append({
                            'field': 'data.permission_bit_sequence',
                            'description': 'Dependency permission must be selected',
                        })

        return errors

    def create(data):
        """
        Method creates a new role with the data.
        Returns : Dict
        """
        errors = []
        role_ = Role.filter_objects_by_keywords(
            {'name': data['name']},
            first_one=True
        )
        if role_:
            errors.append({
                'field': 'data.name',
                'description': 'Role already in use',
            })

        if 'permission_bit_sequence' in data and data['permission_bit_sequence']:
            errors = RoleActions.permission_dependency_validation(
                errors=errors,
                permission_bit_sequence=data['permission_bit_sequence'],
            )

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        # Create the model/row in the database
        role = Role(data)

        role_details = role.get_details()

        return role_details

    def get_all(params={}):
        """
        Method gets all roles details.
        Params : Dict
        Returns : List
        """
        TotalUserForRoleSubQuery = (
            Role.query
            .join(
                User,
                User.id_role == Role.id_
            )
            .with_entities(
                User.id_role,
                func.count(User.id_role).label('count')
            ).filter(
                Role.is_deleted == False,
                User.is_deleted == False
            ).group_by(User.id_role)
        ).subquery()

        q = (
            Role.query
            .outerjoin(
                TotalUserForRoleSubQuery,
                TotalUserForRoleSubQuery.c.id_role == Role.id_,
            )
            .with_entities(
                TotalUserForRoleSubQuery.c.count.label('total_users')
            )
            .add_entity(Role)
            .filter(
                Role.is_deleted == False
            )
            .order_by(Role.id_)
        )

        roles = q.all()
        roles_details = [
            {
                **role.Role.get_details(),
                'number_of_users': role.total_users if role.total_users else 0,
            }
            for role in roles
            if role.Role
        ]

        return roles_details

    def get(id_):
        """
        Method get a specific role based on ID.
        Returns : Dict
        """

        role = Role.get_one(id_, with_organization=False)
        if not role:
            raise ResourceNotFound

        return role.get_details()

    def update(id_, data):
        """
        Method updates a specific role based on ID.
        Returns : Dict
        """

        role = Role.get_one(id_, with_organization=False)
        if not role:
            raise ResourceNotFound

        errors = []
        previous_version = role.get_details()
        if 'permission_bit_sequence' in data and data['permission_bit_sequence']:
            errors = RoleActions.permission_dependency_validation(
                errors=errors,
                permission_bit_sequence=data['permission_bit_sequence'],
            )

        if 'name' in data and data['name']:
            role_ = Role.filter_objects_by_keywords(
                {'name': data['name']},
                first_one=True
            )
            if role_ and role_.id_ != role.id_:
                errors.append({
                    'field': 'data.name',
                    'description': 'Role already in use',
                })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        role.update(data)

        current_version = role.get_details()

        return current_version

    def delete(id_):
        """
        Method deletes a specific role based on ID.
        Returns : None
        """
        role = Role.get_one(id_, with_organization=False)
        if not role:
            raise ResourceNotFound

        users = User.filter_objects_by_keywords(
            {'id_role': role.id_},
            first_one=True
        )
        if users:
            raise InvalidRequestData(
                message='Cannot delete role as this role associated with a user'
            )

        previous_version = role.get_details()

        role.soft_delete()

        return None


class IndustryActions():
    """
    Actions to handle Industries module
    """

    def get_industries_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Industry.id_,

        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Industry.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = Industry.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        industries_details = []
        for result in results:
            industry_details = result.Industry.get_details()
            industries_details.append(industry_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return Industry.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=industries_details,
            )

        return industries_details

    def industry_data_validation(data, errors):
        return errors

    def create(data):
        errors = []
        errors = IndustryActions.industry_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        industry = Industry(data)

        params = {
            'id_': str(industry.id_)
        }

        return IndustryActions.get_industries_details(params=params)

    def get_all(params={}):
        return IndustryActions.get_industries_details(params=params)

    def get(id_):
        industry = Industry.get_one(id_, with_organization=False)

        if not industry:
            raise ResourceNotFound

        params = {
            'id_': str(industry.id_)
        }

        return IndustryActions.get_industries_details(params=params)

    def update(id_, data):
        industry = Industry.get_one(id_, with_organization=False)

        if not industry:
            raise ResourceNotFound

        errors = []
        errors = IndustryActions.industry_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        industry.update(data)

        params = {
            'id_': str(industry.id_)
        }

        return IndustryActions.get_industries_details(params=params)

    def delete(id_):
        industry = Industry.get_one(id_, with_organization=False)

        if not industry:
            raise ResourceNotFound

        industry.soft_delete()

        return None


class CompanyActions():
    """
    Actions to handle Company module
    """

    def get_companies_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Company.id_,
        }

        outerjoins = [
            # (To_Model, To_Model.Column_name, From_Model.Column_name)
            (Industry, Industry.id_, Company.id_industry),
            (CompanyType, CompanyType.id_,  Company.id_company_type),
            (Address, Address.id_, Company.id_address),
            (Country, Country.id_, Address.id_country),
            (Level1SubDivision, Level1SubDivision.id_, Address.id_level_1_sub_division),
            (Level2SubDivision, Level2SubDivision.id_, Address.id_level_2_sub_division),
            (City, City.id_, Address.id_city),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Company.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
        )

        if 'q' in params and params['q']:
            or_filters = []
            filter_string = '%'
            for each_char in params['q']:
                filter_string = filter_string + each_char + '%'

            or_filters.append(
                Industry.name.ilike(filter_string)
            )
            or_filters.append(
                Company.name.ilike(filter_string)
            )
            or_filters.append(
                Company.short_name.ilike(filter_string)
            )
            or_filters.append(
                Company.ultra_short_name.ilike(filter_string)
            )

            if or_filters:
                q = q.filter(
                    or_(*tuple(or_filters))
                )


        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = Company.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        custom_field_types = FieldType.get_all()
        ids_field_types_and_details = {}
        for each_field_type in custom_field_types:
            ids_field_types_and_details[str(each_field_type.id_)] = each_field_type.get_details()

        # Get all ids of the above results object
        ids_company = []
        company_bridge_custom_fields_details = {}
        for result in results:
            ids_company.append(result.Company.id_)
            for key, value in result.Company.custom_fields.items():
                if result.Company.id_ not in company_bridge_custom_fields_details:
                    company_bridge_custom_fields_details[result.Company.id_] = []
                company_bridge_custom_fields_details[result.Company.id_].append(
                    {
                        'value': value,
                        'field_type_details': ids_field_types_and_details.get(key),
                    }
                )

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.
        company_bridge_specializations = (
            CompanyBridgeSpecialization.query
            .outerjoin(
                Specialization,
                and_(
                    Specialization.id_ == CompanyBridgeSpecialization.id_specialization,
                    Specialization.is_deleted == False,
                )
            )
            .add_entity(Specialization)
            .add_entity(CompanyBridgeSpecialization)
            .filter(
                CompanyBridgeSpecialization.is_deleted == False,
                CompanyBridgeSpecialization.id_company.in_(ids_company),
            )
        ).all()
        company_bridge_specialization_details = {}
        for each_company_bridge_specialization in company_bridge_specializations:
            if each_company_bridge_specialization.CompanyBridgeSpecialization.id_company not in company_bridge_specialization_details:
                company_bridge_specialization_details[each_company_bridge_specialization.CompanyBridgeSpecialization.id_company] = [
                    each_company_bridge_specialization.Specialization.get_details()
                ]
            else:
                company_bridge_specialization_details[each_company_bridge_specialization.CompanyBridgeSpecialization.id_company].append(
                    each_company_bridge_specialization.Specialization.get_details()
                )

        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        companies_details = []
        for result in results:
            company_details = result.Company.get_details()
            company_details['industry_details'] = result.Industry.get_details()\
                if result.Industry else None
            company_details['company_type_details'] = result.CompanyType.get_details()\
                if result.CompanyType else None
            company_details['specializations_details'] = company_bridge_specialization_details.get(
                result.Company.id_, None
            )
            company_details['address_details'] = {
                **result.Address.get_details(),
                'level_1_sub_division_details': result.Level1SubDivision.get_details()\
                    if result.Level1SubDivision else None,
                'level_2_sub_division_details': result.Level2SubDivision.get_details()\
                    if result.Level2SubDivision else None,
                'country_details': result.Country.get_details()\
                    if result.Country else None,
                'city_details': result.City.get_details()\
                    if result.City else None,
            } if result.Address else None
            company_details['custom_fields'] = company_bridge_custom_fields_details.get(
                result.Company.id_
            )
            companies_details.append(company_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return Company.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=companies_details,
            )

        return companies_details

    def company_data_validation(data, errors):
        if data.get('id_company_type'):
            company_type = CompanyType.get_one(data.get('id_company_type'))
            if not company_type:
                errors.append({
                    'field': f'data.id_company_type',
                    'description': 'Invalid value for Company type',
                })

        if data.get('id_industry'):
            industry = Industry.get_one(data['id_industry'])
            if not industry:
                errors.append({
                    'field': f'data.id_industry',
                    'description': 'Invalid value for Industry',
                })

        if 'ids_specialization' in data and data['ids_specialization']:
            specializations = Specialization.filter_objects_by_list_values(
                column_=Specialization.id_,
                values=data['ids_specialization'],
            )
            ids_specialization = [
                each_specialization.id_
                for each_specialization in specializations
                if each_specialization and each_specialization.id_
            ]
            for index, id_specialization in enumerate(data['ids_specialization']):
                if id_specialization not in ids_specialization:
                    errors.append({
                        'field': f'data.ids_specialization.{index}',
                        'description': 'Invalid value for specialization',
                    })

        if 'address' in data and data['address']:
            errors = CommonValidations.validate_address(
                errors=errors,
                data=data,
                address_details_name='address',
            )

        if 'custom_fields' in data and data['custom_fields']:
            errors = CommonValidations.validate_custom_fields_with_respective_to_object_type(
                errors=errors,
                data=data,
                id_object_type=1
            )

        return errors

    def create(data):
        errors = []
        errors = CompanyActions.company_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        company = Company(data)
        if 'ids_specialization' in data and data['ids_specialization']:
            for each_specialization in list(set(data['ids_specialization'])):
                each_specialization_data = {
                    'id_specialization': each_specialization,
                    'id_company': company.id_
                }
                specialization = CompanyBridgeSpecialization(each_specialization_data)

        # TODO: Add address to address model and update address ID to company object.
        if 'address' in data and data['address']:
            address = Address(data['address'])
            company.id_address = address.id_
            db.session.flush()

        # Customize the params
        params = {
            'id_': str(company.id_)
        }

        return CompanyActions.get_companies_details(params=params)[0]

    def get_all(params={}):
        return CompanyActions.get_companies_details(params=params)

    def get(id_):
        company = Company.get_one(id_, with_organization=False)

        if not company:
            raise ResourceNotFound

        # Customize the params
        params = {
            'id_': str(company.id_)
        }

        return CompanyActions.get_companies_details(params=params)[0]

    def update(id_, data):
        company = Company.get_one(id_, with_organization=False)

        if not company:
            raise ResourceNotFound

        errors = []
        errors = CompanyActions.company_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        company.update(data)
        if 'ids_specialization' in data and type(data['ids_specialization']) == list:
            company_bridge_specialization = CompanyBridgeSpecialization.filter_objects_by_keywords(
                {'id_company': company.id_},
            )
            # Get all existing company bridge specialization IDS
            existing_ids_specialization = [
                each_specialization.id_specialization
                for each_specialization in company_bridge_specialization
            ]
            if existing_ids_specialization != data['ids_specialization']:
                # Get all the company bridge specialization IDS to be added
                add_ids_specialization = [
                    id_specialization
                    for id_specialization in data['ids_specialization']
                    if id_specialization not in existing_ids_specialization
                ]
                # Get all the company bridge specialization IDS to be deleted
                delete_ids_specialization = [
                    id_specialization
                    for id_specialization in existing_ids_specialization
                    if id_specialization not in data['ids_specialization']
                ]
                # Add the company bridge specialization IDS
                if add_ids_specialization:
                    for id_specialization in add_ids_specialization:
                        company_bridge_specialization_data = {
                            'id_company': company.id_,
                            'id_specialization': id_specialization,
                        }
                        company_bridge_specialization = CompanyBridgeSpecialization(
                            company_bridge_specialization_data
                        )

                # Delete the company bridge specialization IDS
                if delete_ids_specialization:
                    delete_company_bridge_specializations = CompanyBridgeSpecialization.query.filter(
                        CompanyBridgeSpecialization.id_specialization.in_(
                            delete_ids_specialization),
                        CompanyBridgeSpecialization.id_company == company.id_,
                        CompanyBridgeSpecialization.is_deleted == False
                    ).all()
                    for delete_company_bridge_specialization in delete_company_bridge_specializations:
                        delete_company_bridge_specialization.soft_delete()
        if 'address' in data and data['address']:
            if 'id' in data['address'] and data['address']['id']:
                address = Address.filter_objects_by_keywords(
                    {'id_': data['address']['id']},
                    first_one=True,
                )
                if address:
                    if 'is_deleted' in data['address'] and data['address']['is_deleted']:
                        # Delete
                        address.soft_delete()
                        company.id_address = None
                    else:
                        # Update
                        old_address_details = {
                            **address.main_details(),
                            'id_country': address.id_country,
                            'id_level_1_sub_division': address.id_level_1_sub_division,
                            'id_level_2_sub_division': address.id_level_2_sub_division,
                            'id_city': address.id_city,
                        }
                        address_details = {**data['address'], **old_address_details}
                        address.update(address_details)
            else:
                # Create
                if company.id_address:
                    old_company_address = Address.filter_objects_by_keywords(
                        {'id_': company.id_address},
                        first_one=True,
                    )
                    if old_company_address:
                        old_company_address.soft_delete()

                address = Address(data['address'])
                company.id_address = address.id_
                db.session.flush()

        # Customize the params
        params = {
            'id_': str(company.id_)
        }

        return CompanyActions.get_companies_details(params=params)[0]

    def delete(id_):
        company = Company.get_one(id_, with_organization=False)

        if not company:
            raise ResourceNotFound

        company.soft_delete()

        return None


class LeadActions():
    allowed_global_variables = {'sender_domain'}
    allowed_objects_and_variables = {
        'lead': Lead.email_usable_fields,
        'company': Company.email_usable_fields,
    }

    def get_lead_imports_details(params={}):
        q = LeadImport.get_all_objects()


        # Fetch the results
        results = q.all()

        lead_imports_details = []
        for lead_import in results:
            lead_imports_details.append(lead_import.LeadImport.get_details())

        return lead_imports_details

    def get_leads_details(params={}):
        # Collect all leads ids to be filtered
        ids_lead = []
        if 'ids_campaign' in params and params['ids_campaign']:
            ids_campaign = [
                int(each_number)
                for each_number in params['ids_campaign'].split(',')
                if each_number and each_number.isdigit()
            ]
            if ids_campaign:
                campaigns = (
                    CampaignBridgeLead.query
                    .outerjoin(
                        Campaign,
                        and_(
                            Campaign.id_ == CampaignBridgeLead.id_campaign,
                            Campaign.is_deleted == False,
                        )
                    )
                    .add_entity(CampaignBridgeLead)
                    .add_entity(Campaign)
                    .filter(
                        CampaignBridgeLead.id_campaign.in_(ids_campaign),
                        CampaignBridgeLead.is_deleted == False,
                    )
                ).all()

                for each_campaign in campaigns:
                    if each_campaign.CampaignBridgeLead.id_lead not in ids_lead:
                        ids_lead.append(each_campaign.CampaignBridgeLead.id_lead)

        filterable_and_sortable_fields = {
            # front end key: actual column
            'id': Lead.id_,
            'id_': Lead.id_,
            'ids': Lead.id_,
            'ids_company': Company.id_,
            'ids_country': Country.id_,
            # 'statuses': Lead.status,
            'steps': Lead.step,
            'id_step': Lead.id_step,
            'has_failed_on_step': Lead.has_failed_on_step,
        }

        outerjoins = [
            # (To_Model, To_Model.Column_name, From_Model.Column_name)
            (Designation, Designation.id_, Lead.id_designation),
            # (Timezone, Timezone.id_,  Lead.id_timezone),
            (Company, Company.id_, Lead.id_company),
            (Address, Address.id_, Lead.id_address),
            (Country, Country.id_, Address.id_country),
            (Level1SubDivision, Level1SubDivision.id_, Address.id_level_1_sub_division),
            (Level2SubDivision, Level2SubDivision.id_, Address.id_level_2_sub_division),
            (City, City.id_, Address.id_city),
            # (Industry, Industry.id_, Company.id_industry),
            (Industry, Industry.id_, Lead.id_industry),
            (File, File.id_, Lead.id_demo_design_picture),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Lead.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
        )

        if 'q' in params and params['q']:
            or_filters = []
            filter_string = '%'
            for each_char in params['q']:
                filter_string = filter_string + each_char + '%'

            or_filters.append(
                Lead.name.ilike(filter_string)
            )
            or_filters.append(
                Lead.email.ilike(filter_string)
            )

            if or_filters:
                q = q.filter(
                    or_(*tuple(or_filters))
                )


        # Custom filterings
        if ids_lead:
            q = q.filter(
                Lead.id_.in_(ids_lead)
            )

        # Order by

        order_by = getattr(Lead, params.get('order_by', 'id_'))
        if params.get('reverse', '').lower() == 'true':
            order_by = order_by.desc()

        q = q.order_by(
            order_by
        )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = Lead.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        custom_field_types = FieldType.get_all()
        ids_field_types_and_details = {}
        for each_field_type in custom_field_types:
            ids_field_types_and_details[str(each_field_type.id_)] = each_field_type.get_details()

        # Get all ids of the above results object
        lead_bridge_custom_fields_details = {}
        ids_lead = []
        for result in results:
            ids_lead.append(result.Lead.id_)
            for key, value in result.Lead.custom_fields.items():
                if result.Lead.id_ not in lead_bridge_custom_fields_details:
                    lead_bridge_custom_fields_details[result.Lead.id_] = []
                lead_bridge_custom_fields_details[result.Lead.id_].append(
                    {
                        'value': value,
                        'field_type_details': ids_field_types_and_details.get(key),
                    }
                )

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.
        users_bridge_leads_linkedins = (
            UserBridgeLeadLinkedin.query
            .outerjoin(
                User,
                and_(
                    User.id_ == UserBridgeLeadLinkedin.id_user,
                    User.is_deleted == False,
                )
            ).outerjoin(
                Lead,
                and_(
                    Lead.id_ == UserBridgeLeadLinkedin.id_lead,
                    Lead.is_deleted == False,
                )
            ).filter(
                UserBridgeLeadLinkedin.id_lead.in_(ids_lead),
                UserBridgeLeadLinkedin.is_deleted == False,
            )
            .add_entity(User)
            .add_entity(UserBridgeLeadLinkedin)
            .add_entity(Lead)
        ).all()
        users_bridge_leads_linkedins_details = {}
        for users_bridge_leads_linkedin in users_bridge_leads_linkedins:
            # if users_bridge_leads_linkedin.User:
                if users_bridge_leads_linkedin.UserBridgeLeadLinkedin.id_lead not in users_bridge_leads_linkedins_details:
                    users_bridge_leads_linkedins_details[
                        users_bridge_leads_linkedin.UserBridgeLeadLinkedin.id_lead
                        ] = [
                            {
                                **users_bridge_leads_linkedin.UserBridgeLeadLinkedin.get_details(),
                                'user_details' : users_bridge_leads_linkedin.User.get_details()
                            }
                    ]
                else:
                    users_bridge_leads_linkedins_details[
                        users_bridge_leads_linkedin.UserBridgeLeadLinkedin.id_lead
                    ].append({
                        **users_bridge_leads_linkedin.UserBridgeLeadLinkedin.get_details(),
                        'user_details': users_bridge_leads_linkedin.User.get_details()
                    })


        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        leads_details = []
        for result in results:
            lead_details = result.Lead.get_details()
            lead_details['designation_details'] = result.Designation.get_details()\
                if result.Designation else None
            # lead_details['timezone_details'] = result.Timezone.get_details()\
            #     if result.Timezone else None
            lead_details['company_details'] = result.Company.get_details()\
                if result.Company else None
            lead_details['demo_picture_details'] = result.File.get_details()\
                if result.File else None
            lead_details['address_details'] = {
                **result.Address.get_details(),
                'level_1_sub_division_details': result.Level1SubDivision.get_details()\
                    if result.Level1SubDivision else None,
                'level_2_sub_division_details': result.Level2SubDivision.get_details()\
                    if result.Level2SubDivision else None,
                'country_details': result.Country.get_details()\
                    if result.Country else None,
                'city_details': result.City.get_details()\
                    if result.City else None,
            } if result.Address else None
            lead_details['users_details'] = users_bridge_leads_linkedins_details.get(
                result.Lead.id_
            )
            lead_details['custom_fields'] = lead_bridge_custom_fields_details.get(
                result.Lead.id_
            )
            lead_details['industry_details'] = result.Industry.get_details()\
                if result.Industry else None

            print(result)

            leads_details.append(lead_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return Lead.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=leads_details,
            )

        return leads_details

    def lead_data_validation(data, errors, id_=None):
        if data.get('id_industry'):
            industry = Industry.get_one(data['id_industry'], with_organization=False)
            if not industry:
                errors.append({
                    'field': f'data.id_industry',
                    'description': 'Invalid value for Industry',
                })

        if data.get('id_designation'):
            designation = Designation.get_one(data['id_designation'], with_organization=False)
            if not designation:
                errors.append({
                    'field': f'data.id_designation',
                    'description': 'Invalid value for Designation',
                })

        if data.get('id_company'):
            company = Company.get_one(data['id_company'])
            if not company:
                errors.append({
                    'field': f'data.id_company',
                    'description': 'Invalid value for Company',
                })

        if 'ids_user' in data and data['ids_user']:
            users = User.filter_objects_by_list_values(
                column_=User.id_,
                values=data['ids_user'],
            )
            ids_user = [
                user.id_
                for user in users
                if user and user.id_
            ]
            for index, id_user in enumerate(data['ids_user']):
                if id_user not in ids_user:
                    errors.append({
                        'field': f'data.ids_user.{index}',
                        'description': 'Invalid value for user',
                    })

        if 'custom_fields' in data and data['custom_fields']:
            errors = CommonValidations.validate_custom_fields_with_respective_to_object_type(
                errors=errors,
                data=data,
                id_object_type=2
            )

        if 'address' in data and data['address']:
            errors = CommonValidations.validate_address(
                errors=errors,
                data=data,
                address_details_name='address',
            )

        # if 'username' in data and data['username']:
        #     lead_username = Lead.filter_objects_by_keywords(
        #         {'username': data['username']},
        #         first_one=True,
        #         with_organization=True,
        #     )
        #     if lead_username and (not id_ or id_ != lead_username.id_):
        #         errors.append({
        #             'field': 'data.username',
        #             'description': 'Please give an alternative username',
        #         })

        return errors

    def create(data):
        errors = []
        errors = LeadActions.lead_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        # if 'custom_fields' in data and data['custom_fields']:

        username = tokenify(data['first_name'], '')
        if Lead.query.filter(Lead.username==username).first():
            username = tokenify(data['name'], '')

            if Lead.query.filter(Lead.username==username).first():
                username = None
        if username:
            data['username'] = username

        lead = Lead(data)
        if 'address' in data and data['address']:
            address = Address(data['address'])
            lead.id_address = address.id_
            db.session.flush()

        if 'ids_user' in data and data['ids_user']:
            for each_user in list(set(data['ids_user'])):
                each_user_data = {
                    'id_user': each_user,
                    'id_lead': lead.id_,
                    'is_connected': True,
                }
                users_bridge_leads_linkedins = UserBridgeLeadLinkedin(each_user_data)

        params = {
            'id_': str(lead.id_),
        }

        return LeadActions.get_leads_details(params)[0]



    def get_all(params={}):
        return LeadActions.get_leads_details(params)

    def get(id_):
        lead = Lead.get_one(id_, with_organization=False)
        if not lead:
            raise ResourceNotFound

        params = {
            'id_': str(lead.id_)
        }

        return LeadActions.get_leads_details(params)[0]

    def update(id_, data):
        lead = Lead.get_one(id_, with_organization=False)
        if not lead:
            raise ResourceNotFound

        errors = []
        errors = LeadActions.lead_data_validation(
            data=data,
            errors=errors,
            id_=lead.id_,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        company_data = data.pop('company', None)

        lead.update(data)

        if 'ids_user' in data and type(data['ids_user']) == list:
            users_bridge_leads_linkedins = UserBridgeLeadLinkedin.filter_objects_by_keywords(
                {'id_lead': lead.id_},
            )
            # Get all existing lead bridge user IDS
            existing_ids_user = [
                users_bridge_leads_linkedin.id_user
                for users_bridge_leads_linkedin in users_bridge_leads_linkedins
            ]
            if existing_ids_user != data['ids_user']:
                # Get all the lead bridge user IDS to be added
                add_ids_user = [
                    id_user
                    for id_user in data['ids_user']
                    if id_user not in existing_ids_user
                ]
                # Get all the lead bridge user IDS to be deleted
                delete_ids_user = [
                    id_user
                    for id_user in existing_ids_user
                    if id_user not in data['ids_user']
                ]
                # Add the lead bridge user IDS
                if add_ids_user:
                    for id_user in add_ids_user:
                        lead_bridge_user_data = {
                            'id_lead': lead.id_,
                            'id_user': id_user,
                            'is_connected': True,
                        }
                        users_bridge_leads_linkedin = UserBridgeLeadLinkedin(
                            lead_bridge_user_data
                        )

                # Delete the lead bridge user IDS
                if delete_ids_user:
                    delete_lead_bridge_users_linkedin = UserBridgeLeadLinkedin.query.filter(
                        UserBridgeLeadLinkedin.id_user.in_(
                            delete_ids_user),
                        UserBridgeLeadLinkedin.id_lead == lead.id_,
                        UserBridgeLeadLinkedin.is_deleted == False
                    ).all()
                    for delete_lead_bridge_users_linkedin in delete_lead_bridge_users_linkedin:
                        delete_lead_bridge_users_linkedin.soft_delete()
        if 'address' in data and data['address']:
            if 'id' in data['address'] and data['address']['id']:
                address = Address.filter_objects_by_keywords(
                    {'id_': data['address']['id']},
                    first_one=True,
                )
                if address:
                    if 'is_deleted' in data['address'] and data['address']['is_deleted']:
                        # Delete
                        address.soft_delete()
                        lead.id_address = None
                    else:
                        # Update
                        old_address_details = {
                            **address.main_details(),
                            'id_country': address.id_country,
                            'id_level_1_sub_division': address.id_level_1_sub_division,
                            'id_level_2_sub_division': address.id_level_2_sub_division,
                            'id_city': address.id_city,
                        }
                        address_details = {**data['address'], **old_address_details}
                        address.update(address_details)
            else:
                # Create
                if lead.id_address:
                    old_lead_address = Address.filter_objects_by_keywords(
                        {'id_': lead.id_address},
                        first_one=True,
                    )
                    if old_lead_address:
                        old_lead_address.soft_delete()

                address = Address(data['address'])
                lead.id_address = address.id_
                db.session.flush()

        company = Company.get_one(lead.id_company, with_organization=False)
        if company and company_data:
            company.update(company_data)

        params = {
            'id_': str(lead.id_),
        }

        return LeadActions.get_leads_details(params)[0]

    def delete(id_):
        lead = Lead.get_one(id_, with_organization=False)
        if not lead:
            raise ResourceNotFound

        lead.soft_delete()

        return None

    def unsubscribe(unsubscribe_token):
        logger.info('Inside unsubscribe flow', unsubscribe_token)
        lead = Lead.filter_objects_by_keywords(
            {
                'unsubscribe_token': unsubscribe_token,
            },
            first_one=True,
        )

        errors = []
        if lead is None:
            errors.append({
                'field': f'unsubscribe_token',
                'description': 'Lead with unsubscribe token was not found',
            })

        if errors:
            raise InvalidRequestData(errors)

        #Add unsubscribe event to activities
        lead_activity_data = {}
        lead_activity_data['id_lead'] = lead.id_
        lead_activity_data['type_'] = 'unsubscribe'
        lead_activity_data['activity_time'] = datetime.now()
        lead_activity = LeadActivity(lead_activity_data)

        lead.is_unsubscribed = True
        lead.unsubscription_date = datetime.now()
        lead.unsubscribed_manually = False

        InstantlyActions.add_email_to_instantly_blocklist(
            lead,
        )
        # Send Slack notification
        SlackActions.send_slack_notification(
            'unsubscribe',
            lead,
        )

        return None

    def _get_variable_errors(template):
        """
        Returns errors related to wrong variables, spintaxes, etc.

        Also returns other items for to avoid redundant querying/calculation.
        """

        errors = []

        allowed_spintax_variable_rows = SpintaxVariable.filter_objects_by_keywords(
            filters={'id_template': template.id_}
        )
        allowed_spintax_variables = {row.token for row in allowed_spintax_variable_rows}

        # 0. Get the variables and spintax variables from the template
        pattern = r'\{\{([^}]+)\}\}'

        matches = re.findall(pattern, template.title)
        matches += re.findall(pattern, template.body)

        global_variables = set()
        object_variables = set()
        # object_variables_map = {'asdf': set(), 'lead': {'a', 'b'}}
        object_variables_map = {}
        spintax_variables = set()
        spintax_variable_ids = set()    # Used below to query variants
        for match in matches:
            if match.startswith('spin.'):
                spintax_variables.add(match[len('spin.'):])
            elif '.' in match:
                object_variables.add(match)
                object_ = match.split('.')[0]
                variable = match.split('.')[1]

                # Add the object
                if object_ not in object_variables_map:
                    object_variables_map[object_] = set()

                # Append the variable
                object_variables_map[object_].add(variable)
            else:
                global_variables.add(match)

        # 1. Verify variables inside the template
        # - verify global variables
        unknown_global_variables = global_variables - LeadActions.allowed_global_variables
        if unknown_global_variables:
            errors.append({
                'field': 'global_variables',
                'description': f'Unknown global variables ({", ".join(unknown_global_variables)}) found in the template'
            })

        # - verify spintax variables
        unknown_spintax_variables = spintax_variables - allowed_spintax_variables
        if unknown_spintax_variables:
            errors.append({
                'field': 'spintax_variables',
                'description': f'Unknown spintax variables ({", ".join(unknown_spintax_variables)}) found in the template'
            })

        # - verify objects
        unknown_objects = set(
            object_variables_map.keys()
        ) - set(LeadActions.allowed_objects_and_variables.keys())
        if unknown_objects:
            errors.append({
                'field': 'objects',
                'description': f'Unknown objects ({", ".join(unknown_objects)}) found in the template'
            })

        # - verify object variables
        unknown_object_variables = []
        known_objects = set(
            object_variables_map.keys()
        ) & set(LeadActions.allowed_objects_and_variables.keys())
        for object_ in known_objects:
            for variable in object_variables_map[object_]:
                if variable not in LeadActions.allowed_objects_and_variables[object_]:
                    unknown_object_variables.append(f'{object_}.{variable}')

        if unknown_object_variables:
            errors.append({
                'field': 'objects',
                'description': f'Unknown object variables ({", ".join(unknown_object_variables)}) found in the template'
            })

        return errors, spintax_variables, allowed_spintax_variable_rows

    def send_email_to_lead(id_lead, data):
        lead = Lead.get_one(id_lead)
        if not lead:
            raise ResourceNotFound

        errors = []

        mail_account = MailAccount.get_one(data['id_mail_account'])
        if mail_account is None:
            errors.append({
                'field': 'data.id_mail_account',
                'description': 'Mail Account with the ID is not found',
            })

        sender_domain = mail_account.email.split('@')[1]
        try:
            email_subject, email_body = LeadActions.get_rendered_template(
                lead,
                data['id_template'],
                sender_domain,
            )
        except InvalidRequestData as e:
            errors += e.errors

        if errors:
            raise InvalidRequestData(errors)

        # Send the email from the sender mail account
        from_ = {
            'name': mail_account.name,
            'email': mail_account.email,
            'mail_account_object': mail_account,
        }
        to = {
            'name': lead.name,
            'email': lead.email,
        }

        EmailActions.send_email_using_gmail_api(
            from_,
            to,
            subject=email_subject,
            content=email_body,
        )

        # TODO
        return 'localhost:8081'
        return request.host

    def get_rendered_template(lead, id_template, sender_domain):
        """
        sender_domain is required to generate the demo URL.
        """

        errors = []
        company = Company.get_one(lead.id_company)
        if not company:
            errors.append({
                'field': 'id_company',
                'description': 'Lead is not associated with a company',
            })

        template = Template.get_one(id_template)
        if template is None:
            errors.append({
                'field': 'data.id_template',
                'description': 'Template with the ID is not found',
            })

        # Check for variable errors
        (
            variable_errors,
            spintax_variables,
            allowed_spintax_variable_rows,
        ) = LeadActions._get_variable_errors(template)

        errors += variable_errors
        if errors:
            raise InvalidRequestData(errors)

        # 2.1 Generate the spintax variants map
        allowed_spintax_variable_token_id_map = {}
        for allowed_spintax_variable_row in allowed_spintax_variable_rows:
            allowed_spintax_variable_token_id_map[
                allowed_spintax_variable_row.token
            ] = allowed_spintax_variable_row.id_

        # FORMAT:
        # spintax_variants_map = {
        #     'greeting': [
        #         'Hello there',
        #         'Hi there',
        #     ]
        # }

        # TODO use a single query to fetch the variants
        spintax_variants_map = {}
        for spintax_variable_token in spintax_variables:
            spintax_variant_rows = SpintaxVariant.filter_objects_by_keywords(
                filters={
                    'id_spintax_variable': allowed_spintax_variable_token_id_map[
                        spintax_variable_token
                    ]
                }
            )
            spintax_variants_map[spintax_variable_token] = [
                variant.text for variant in spintax_variant_rows
            ]

        # 2.2 Generate the "spin" variable to be used by Jinja
        SpintaxForJinja = namedtuple(
            'Spintax',
            list(spintax_variables),
        )

        chosen_spintax_variants = []
        for variable in spintax_variables:
            chosen_spintax_variants.append(
                spintax_variants_map[variable][
                    random.randint(0, len(spintax_variants_map[variable]) - 1)
                ]
            )

        # The "spin" variable for jinja
        spin = SpintaxForJinja(*chosen_spintax_variants)

        # 3. Render the Jinja template and get the rendered string
        # For subject
        r_template_subject = Environment(loader=BaseLoader()).from_string(template.title)
        email_subject = r_template_subject.render(
            lead=lead,
            sender_domain=sender_domain,
            spin=spin,
            company=company,
        )

        # For body
        r_template_body = Environment(loader=BaseLoader()).from_string(template.body)
        email_body = r_template_body.render(
            lead=lead,
            sender_domain=sender_domain,
            spin=spin,
            company=company,
        )

        ic(r_template_body, r_template_subject)

        return email_subject, email_body

    def bulk_leads_import(files, config):
        file_response = FileActions.create(files, config)[0]
        rows = get_rows_from_csv(
            f_path=f'{app.root_path}{file_response["path"]}',
            header=True,
            empty_check_col=True,
        )

        emails_to_be_verified = []

        maps = {
            'cities': {},
            'countries': {},
            'industries': {},
            'designations': {},
            'company_types': {},
            'specializations': {},
            'level_1_sub_divisions': {},
            'level_2_sub_divisions': {},
            'companies_name_with_ids': {},
        }
        companies = Company.get_all()
        for each_company in companies:
            maps['companies_name_with_ids'][each_company.name] = each_company.id_

        designations = Designation.get_all(with_organization=False)
        for each_designation in designations:
            maps['designations'][each_designation.name] = each_designation.id_

        countries = Country.get_all(with_organization=False)
        for each_country in countries:
            maps['countries'][each_country.name] = each_country.id_

        level_1_sub_divisions = Level1SubDivision.get_all(with_organization=False)
        for each_level_1_sub_division in level_1_sub_divisions:
            maps['level_1_sub_divisions'][each_level_1_sub_division.name] = each_level_1_sub_division.id_

        level_2_sub_divisions = Level2SubDivision.get_all(with_organization=False)
        for each_level_2_sub_division in level_2_sub_divisions:
            maps['level_2_sub_divisions'][each_level_2_sub_division.name] = each_level_2_sub_division.id_

        cities = City.get_all(with_organization=False)
        for each_city in cities:
            maps['cities'][each_city.name] = each_city.id_

        industries = Industry.get_all(with_organization=False)
        for each_industry in industries:
            maps['industries'][each_industry.name] = each_industry.id_

        company_types = CompanyType.get_all(with_organization=False)
        for each_company_type in company_types:
            maps['company_types'][each_company_type.name] = each_company_type.id_

        specializations = Specialization.get_all(with_organization=False)
        for each_specialization in specializations:
            maps['specializations'][each_specialization.name] = each_specialization.id_

        company_address_data_key_and_index = {
            'basic_info': 26,
            'id_city': 27,
            'id_level_1_sub_division': 28,
            'id_level_2_sub_division': 29,
            'id_country': 30,
        }
        id_industry_index = 18
        id_company_type_index = 40
        company_data_key_and_index = {
            # 'name': 20, # Required
            'name': 10, # Required
            'short_name': 11,
            'ultra_short_name': 12,
            'website_url': 15,
            'founded_year': (41, lambda x: int(float(x)) if x else None),
            'logo_path': 20,
            'annual_revenue': (21, int),
            'employee_count': (23, int),
            'employee_count_min': (24, int),
            'employee_count_max': (25, int),
            'description': 42,
        }

        lead_address_data_key_and_index = {
            'basic_info': 32,
            'id_city': 27,
            'id_level_1_sub_division': 28,
            'id_level_2_sub_division': 29,
            'id_country': 30,
        }

        id_designation_index = 17
        lead_data_key_and_index = {
            'name': 0, # Required
            'first_name': 1,
            'last_name': 2,
            'email': 3,
            'email_status': 4,
            'email_status_updated_on': 5,
            'last_contacted_on': 6,
            'number_of_follow_ups': (7, int),
            'email_response_status': 8,
            'phone': 9,
            'first_sentence': 13,
            'last_sentence': 14,
            'linkedin_url': 16,
            'timezone': 31,
        }

        # Validations and handling exceptions here
        for index, each_row in enumerate(rows):
            # Company
            if not each_row[company_data_key_and_index['name']]:
                raise InvalidRequestData(message='Lead is not associated with company')

            # Leads
            if not each_row[lead_data_key_and_index['name']]:
                raise InvalidRequestData(message=f"Lead's name is missing at {index}")

        address_row_index_and_record_id = {}


        ic(file_response)
        # Create the import row
        lead_import_data = {
            'file_path': file_response['path'],
            # TODO Can't get the original file name
            'original_file_name': file_response['path'].split('/')[-1],
            'total_rows': len(rows),
        }
        lead_import = LeadImport(lead_import_data)
        db.session.add(lead_import)
        db.session.flush()


        total_imported_count = 0
        # Add data to respective models
        for index, each_row in enumerate(rows):
            # # If company unique name not in company_name_with_ids, add it.
            # # Else ignore it, as it is already present.

            if each_row[id_designation_index] and each_row[id_designation_index] not in maps['designations']:
                designation = Designation({'name': each_row[id_designation_index]})
                maps['designations'][each_row[id_designation_index]] = designation.id_

            if each_row[id_company_type_index] and each_row[id_company_type_index] not in maps['company_types']:
                company_type = CompanyType({'name': each_row[id_company_type_index]})
                maps['company_types'][each_row[id_company_type_index]] = company_type.id_

            if each_row[id_industry_index] and each_row[id_industry_index] not in maps['industries']:
                industry = Industry({'name': each_row[id_industry_index]})
                maps['industries'][each_row[id_industry_index]] = industry.id_

            id_company_address = None
            company_address_data = {}
            '''
            for key, column_index in company_address_data_key_and_index.items():
                if len(each_row) < column_index and not each_row[column_index]:
                    continue
                if key.startswith('id_'):
                    if key == 'id_city' and maps['cities'].get(each_row[column_index]):
                        company_address_data[key] = maps['cities'].get(each_row[column_index])
                    elif key == 'id_level_1_sub_division' and maps['level_1_sub_divisions'].get(each_row[column_index]):
                        company_address_data[key] = maps['level_1_sub_divisions'].get(each_row[column_index])
                    elif key == 'id_level_2_sub_division':
                        company_address_data[key] = maps['level_2_sub_divisions'].get(each_row[column_index])
                    elif key == 'id_country':
                        company_address_data[key] = maps['countries'].get(each_row[column_index])
                else:
                    company_address_data[key] = each_row[column_index]

                company_address = Address(company_address_data)
                id_company_address = company_address.id_
            '''
            company_location = each_row[26]
            if company_location:
                location_details = company_location.split(',')
                ic(location_details)
                address_length = len(location_details)
                if address_length >= 1:
                    company_address_data['id_country'] = maps['countries'].get(location_details[-1].strip())
                if address_length >= 2:
                    company_address_data['id_level_1_sub_division'] = maps['level_1_sub_divisions'].get(location_details[-2].strip())
                if address_length >= 3:
                    company_address_data['id_city'] = maps['cities'].get(location_details[-3].strip())

                company_address = Address(company_address_data)
                id_company_address = company_address.id_

            id_lead_address = None
            lead_address_data = {}
            '''
            for key, column_index in lead_address_data_key_and_index.items():
                if len(each_row) < column_index and not each_row[column_index]:
                    continue
                if key.startswith('id_'):
                    if key == 'id_city' and maps['cities'].get(each_row[column_index]):
                        lead_address_data[key] = maps['cities'].get(each_row[column_index])
                    elif key == 'id_level_1_sub_division' and maps['level_1_sub_divisions'].get(each_row[column_index]):
                        lead_address_data[key] = maps['level_1_sub_divisions'].get(each_row[column_index])
                    elif key == 'id_level_2_sub_division':
                        lead_address_data[key] = maps['level_2_sub_divisions'].get(each_row[column_index])
                    elif key == 'id_country':
                        lead_address_data[key] = maps['countries'].get(each_row[column_index])
                else:
                    lead_address_data[key] = each_row[column_index]

                lead_address = Address(lead_address_data)
                id_lead_address = lead_address.id_
            '''
            lead_location = each_row[32]
            if lead_location:
                location_details = lead_location.split(',')
                address_length = len(location_details)
                if address_length >= 1:
                    lead_address_data['id_country'] = maps['countries'].get(location_details[-1].strip())
                if address_length >= 2:
                    lead_address_data['id_level_1_sub_division'] = maps['level_1_sub_divisions'].get(location_details[-2].strip())
                if address_length >= 3:
                    lead_address_data['id_city'] = maps['cities'].get(location_details[-3].strip())

                lead_address = Address(lead_address_data)
                id_lead_address = lead_address.id_

            lead_data = {}
            if each_row[company_data_key_and_index['name']] not in maps['companies_name_with_ids']:
                company_data = {
                    **CommonActions.import_data_based_on_column_index(
                        each_row, company_data_key_and_index
                    )
                }
                company_data['id_organization'] = request.user.id_organization
                company_data['id_address'] = id_company_address
                company_data['id_industry'] = maps['industries'][each_row[id_industry_index]]\
                    if id_industry_index and each_row[id_industry_index] else None
                company_data['id_company_type'] = maps['company_types'][each_row[id_company_type_index]]\
                    if id_company_type_index and each_row[id_company_type_index] else None
                company = Company(company_data)
                maps['companies_name_with_ids'][company.name] = company.id_

            lead_data = {
                **CommonActions.import_data_based_on_column_index(
                    each_row, lead_data_key_and_index
                )
            }
            lead_data['id_designation'] = maps['designations'][each_row[id_designation_index]]\
                if id_designation_index and each_row[id_designation_index] else None
            lead_data['id_address'] = id_lead_address
            lead_data['id_organization'] = request.user.id_organization
            lead_data['id_company'] = maps['companies_name_with_ids'][each_row[company_data_key_and_index['name']]]





            lead_data['instantly_email_sender'] = each_row[48]
            lead_data['competitors'] = each_row[49]


            # Check if lead's email is not already present
            if Lead.query.filter(Lead.email==lead_data['email']).first():
                print(f'Lead with email {lead_data["email"]} is already present. Skipping..')
                continue








            username = tokenify(lead_data['first_name'], '')
            if Lead.query.filter(Lead.username==username).first():
                username = tokenify(lead_data['name'], '')

                if Lead.query.filter(Lead.username==username).first():
                    username = None
            if username:
                lead_data['username'] = username

            total_imported_count += 1
            lead = Lead(lead_data)
            lead.id_lead_import = lead_import.id_

            # Validate email
            # If email status is not present,
            # If done 6 months ago and email status was valid.
            if not lead.email_status or (
                lead.email_status == 'valid' and lead.email_status_updated_on and\
                normalize_date(lead.email_status_updated_on) < datetime.now() - timedelta(days=180)
            ):
                emails_to_be_verified.append({
                    'email' : lead.email
                })

        lead_import.imported_rows_count = total_imported_count

        # TODO: Disabling it temporarily - coz not sure if this will work
        # if emails_to_be_verified:
        #     job = queue.enqueue(
        #         send_leads_emails_to_never_bounce_for_validation_rq,
        #         emails_to_be_verified,
        #     )

        return file_response

    def export_leads(file_name=None, fields=None, type_='csv'):
        ic(request.params.get('id_lead_import'))
        id_lead_import = request.params.get('id_lead_import', '')
        id_lead_import = int(id_lead_import) if id_lead_import.isdigit() else None

        if type_ != 'csv':
            raise Exception(f'Unknown export type `type_`')

        if not file_name:
            file_name = str(uuid.uuid4()) + '.csv'

        file_path = f'{os.getcwd()}/junk/'
        file_full_path = f'{file_path}{file_name}'

        # List of fields
        FIELDS = {
            'name': 'name',
            'first_name': 'firstName',
            'last_name': 'lastName',
            'username': 'username',
            'email': 'email',

            'email_status': 'emailStatus',
            # 'industry_details.name': 'Industry',
            'first_sentence': 'firstSentence',
            'last_sentence': 'lastSentence',
            'company_details.name': 'companyName',
            'company_details.short_name': 'companyShortName',
            'company_details.ultra_short_name': 'companyUltraShortName',
            'last_contacted_on': 'lastContactedOn',
            'email_response_status': 'emailResponseStatus',
            # 'last_verified_on': 'Last Verified On',         # TODO
            # 'competitors': 'Competitors',                   # TODO
            'unsubscribe_token': 'unsubscribeToken',
            'instantly_email_sender': 'instantlyEmailSender',
            'competitors': 'competitors',

            # Special column
            'industry_lowercase': 'industryLowercase',
        }

        # If fields is not given, export all the fields
        if not fields:
            fields = [
                'name',
                'first_name',
                'last_name',
                'username',
                'email',

                'email_status',
                'first_sentence',
                'last_sentence',
                'company_details.name',
                'company_details.short_name',
                'company_details.ultra_short_name',
                'last_contacted_on',
                'email_response_status',
                'unsubscribe_token',

                'instantly_email_sender',
                'competitors',
                'industry_lowercase',
            ]

        leads_details = LeadActions.get_leads_details()

        with open(file_full_path, 'w') as f:
            writer = csv.writer(f, delimiter=',')

            # Construct the header
            header = []
            unknown_fields = []
            for field in fields:
                try:
                    header.append(FIELDS[field])
                except:
                    # Ignore the unknown fields
                    unknown_fields.append(field)

            # Remove the unknown fields
            fields = [field for field in fields if field not in unknown_fields]

            writer.writerow(header)

            for lead in leads_details:
                row = []

                if id_lead_import:
                    if lead['id_lead_import'] != id_lead_import:
                        continue

                for field in fields:
                    # FOR PAUL: This is for NFS custom fields, so not relevant to us
                    #
                    # # Ungroup custom fields first and store as map
                    # installment_fields = {}
                    #
                    # # If the field is an integer, then it is a custom field,
                    # # so, fetch the custom field value
                    # if field.isdigit():
                    #     value = installment_fields.get(
                    #         field
                    #     ) or ''
                    if '.' in field:
                        [parent, child] = field.split('.')
                        value = lead[parent][child]
                    else:
                        if field == 'industry_lowercase':
                            company = Company.get_one(lead['company_details']['id'])
                            industry = Industry.get_one(company.id_industry, with_organization=False)
                            if industry:
                                ic(industry.name)
                                value = tokenify(industry.name, ' ')
                        else:
                            value = lead[field]
                    row.append(value)

                writer.writerow(row)

        return send_from_directory(file_path, file_name, as_attachment=True)


class ObjectTypeActions():
    def get_object_types_details():
        """
        Returns : List
        """
        object_types = ObjectType.get_all()
        object_types_details = []
        for object_type in object_types:
            object_types_details.append(
                object_type.get_details()
            )

        return object_types_details

    def create(data):
        object_type = ObjectType(data)

        return object_type.get_details()

    def get_all():
        return ObjectTypeActions.get_object_types_details()

    def get(id_):
        object_type = ObjectType.get_one(id_, with_organization=False)

        if not object_type:
            raise ResourceNotFound

        return object_type.get_details()

    def update(id_, data):
        object_type = ObjectType.get_one(id_, with_organization=False)

        if not object_type:
            raise ResourceNotFound

        object_type.update(data)

        return object_type.get_details()

    def delete(id_):
        object_type = ObjectType.get_one(id_, with_organization=False)

        if not object_type:
            raise ResourceNotFound

        object_type.soft_delete()

        return None


class FieldGroupActions():
    """
    Actions to handle custom field groups module
    """
    def get_field_groups_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': FieldGroup.id_,
            'id_object_type': FieldGroup.id_object_type,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (ObjectType, ObjectType.id_, FieldGroup.id_object_type),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = FieldGroup.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        ids_field_group = []
        for result in results:
            ids_field_group.append(
                result.FieldGroup.id_
            )

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.
        field_types = FieldType.query.filter(
            FieldType.id_field_group.in_(ids_field_group)
        ).all()

        custom_field_groups_details = {}
        for each_field_type in field_types:
            if each_field_type.id_field_group not in custom_field_groups_details:
                custom_field_groups_details[each_field_type.id_field_group] = [
                    each_field_type.get_details()
                ]
            else:
                custom_field_groups_details[each_field_type.id_field_group].append(
                    each_field_type.get_details()
                )

        field_groups_details = []
        for result in results:
            field_group_details = result.FieldGroup.get_details()
            field_group_details['object_type_details'] = result.ObjectType.get_details()\
                if result.ObjectType else None
            field_group_details['field_types_details'] = custom_field_groups_details.get(
                result.FieldGroup.id_
            )

            field_groups_details.append(field_group_details)

        return field_groups_details

    def field_group_data_validation(data, errors):
        if data.get('id_object_type'):
            object_type = ObjectType.get_one(data.get('id_object_type'), with_organization=False)
            if not object_type:
                errors.append({
                    'field': f'data.id_object_type',
                    'description': 'Invalid value for Object Type',
                })

        return errors

    def create(data):
        errors = []
        errors = FieldGroupActions.field_group_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        field_group = FieldGroup(data)

        params = {
            'id_': str(field_group.id_)
        }

        return FieldGroupActions.get_field_groups_details(params=params)

    def get_all(params={}):
        return FieldGroupActions.get_field_groups_details(params=params)

    def get(id_):
        field_group = FieldGroup.get_one(id_, with_organization=False)

        if not field_group:
            raise ResourceNotFound

        params = {
            'id_': str(field_group.id_)
        }

        return FieldGroupActions.get_field_groups_details(params=params)

    def update(id_, data):
        field_group = FieldGroup.get_one(id_, with_organization=False)

        if not field_group:
            raise ResourceNotFound

        errors = []
        errors = FieldGroupActions.field_group_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        field_group.update(data)

        params = {
            'id_': str(field_group.id_)
        }

        return FieldGroupActions.get_field_groups_details(params=params)

    def delete(id_):
        field_group = FieldGroup.get_one(id_, with_organization=False)

        if not field_group:
            raise ResourceNotFound

        field_group.soft_delete()

        return None


class FieldTypeActions():
    """
    Actions to handle Industries module
    """
    def get_field_types_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': FieldType.id_,
            'id_field_group': FieldGroup.id_,
            'id_objet_type': ObjectType.id_,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (FieldGroup, FieldGroup.id_, FieldType.id_field_group),
            (ObjectType, ObjectType.id_, FieldGroup.id_object_type),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = FieldType.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        field_types_details = []
        for result in results:
            field_type_details = result.FieldType.get_details()
            field_type_details['field_group_details'] = {
                **result.FieldGroup.get_details(),
                'object_type_details': result.ObjectType.get_details()\
                    if result.ObjectType else None
            } if result.FieldGroup else None

            field_types_details.append(field_type_details)

        return field_types_details

    def field_type_data_validation(data, errors):
        if data.get('id_field_group'):
            field_group = FieldGroup.get_one(data.get('id_field_group'))
            if not field_group:
                errors.append({
                    'field': f'data.id_field_group',
                    'description': 'Invalid value for FieldGroup',
                })

        return errors

    def create(data):
        errors = []
        errors = FieldTypeActions.field_type_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )
        if 'type' in data and data['type']:
            data['type_'] = data['type']

        field_type = FieldType(data)

        params = {
            'id_': str(field_type.id_)
        }

        return FieldTypeActions.get_field_types_details(params=params)

    def get_all(params={}):
        return FieldTypeActions.get_field_types_details(params=params)

    def get(id_):
        field_type = FieldType.get_one(id_, with_organization=False)

        if not field_type:
            raise ResourceNotFound

        params = {
            'id_': str(field_type.id_)
        }

        return FieldTypeActions.get_field_types_details(params=params)

    def update(id_, data):
        field_type = FieldType.get_one(id_, with_organization=False)

        if not field_type:
            raise ResourceNotFound

        errors = []
        errors = FieldTypeActions.field_type_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        if 'type' in data and data['type']:
            data['type_'] = data['type']

        field_type.update(data)

        params = {
            'id_': str(field_type.id_)
        }

        return FieldTypeActions.get_field_types_details(params=params)

    def delete(id_):
        field_type = FieldType.get_one(id_, with_organization=False)

        if not field_type:
            raise ResourceNotFound

        field_type.soft_delete()

        return None


class CompanyTypeActions():
    """
    Actions to handle Company Type module
    """
    def get_company_types_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': CompanyType.id_,

        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = CompanyType.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = CompanyType.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with Industry,
        # create result map, else create users_details.
        company_types_details = []
        for result in results:
            company_type_details = result.CompanyType.get_details()
            company_types_details.append(company_type_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return CompanyType.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=company_types_details,
            )

        return company_types_details

    def company_type_data_validation(data, errors):
        return errors

    def create(data):
        errors = []
        errors = CompanyTypeActions.company_type_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        company_type = CompanyType(data)

        params = {
            'id_': str(company_type.id_)
        }

        return CompanyTypeActions.get_company_types_details(params=params)

    def get_all(params={}):
        return CompanyTypeActions.get_company_types_details(params=params)

    def get(id_):
        company_type = CompanyType.get_one(id_, with_organization=False)

        if not company_type:
            raise ResourceNotFound

        params = {
            'id_': str(company_type.id_)
        }

        return CompanyTypeActions.get_company_types_details(params=params)

    def update(id_, data):
        company_type = CompanyType.get_one(id_, with_organization=False)

        if not company_type:
            raise ResourceNotFound

        errors = []
        errors = CompanyTypeActions.company_type_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        company_type.update(data)

        params = {
            'id_': str(company_type.id_)
        }

        return CompanyTypeActions.get_company_types_details(params=params)

    def delete(id_):
        company_type = CompanyType.get_one(id_, with_organization=False)

        if not company_type:
            raise ResourceNotFound

        company_type.soft_delete()

        return None


class CountryActions():
    def get_countries_details(params):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Country.id_,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Country.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        countries_details = []
        for result in results:
            country_details = result.Country.get_details()
            countries_details.append(country_details)

        return countries_details

    def get_all(params):
        return CountryActions.get_countries_details(params=params)


class Level1SubDivisionActions():
    def get_level_1_sub_divisons_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Level1SubDivision.id_,
            'id_country': Country.id_,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (Country, Country.id_, Level1SubDivision.id_country),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Level1SubDivision.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        level_1_sub_divisions_details = []
        for result in results:
            level_1_sub_division_details = result.Level1SubDivision.get_details()
            level_1_sub_division_details['country_details'] = result.Country.get_details()\
                if result.Country else {}
            level_1_sub_divisions_details.append(level_1_sub_division_details)

        return level_1_sub_divisions_details

    def get_all(params={}):
        return Level1SubDivisionActions.get_level_1_sub_divisons_details(params=params)


class Level2SubDivisionActions():
    def get_level_2_sub_divisons_details(params={}):
        """
        This method gets all users and their associated details.
        Returns Type : List
        """
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Level2SubDivision.id_,
            'id_country': Level2SubDivision.id_country,
            'id_level_1_sub_division': Level2SubDivision.id_level_1_sub_division,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (Level1SubDivision, Level1SubDivision.id_, Level2SubDivision.id_level_1_sub_division),
            (Country, Country.id_, Level2SubDivision.id_country),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Level2SubDivision.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        level_2_sub_divisions_details = []
        for result in results:
            level_2_sub_division_details = result.Level2SubDivision.get_details()
            level_2_sub_division_details['country_details'] = result.Country.get_details()\
                if result.Country else {}
            level_2_sub_division_details['level_1_sub_division_details'] = result.Level1SubDivision.get_details()\
                if result.Country else {}
            level_2_sub_divisions_details.append(level_2_sub_division_details)

        return level_2_sub_divisions_details

    def get_all(params={}):
        return Level2SubDivisionActions.get_level_2_sub_divisons_details(params=params)


class CityActions():
    def get_cities_details(params={}):
        """
        This method gets all users and their associated details.
        Returns Type : List
        """
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': City.id_,
            'id_country': City.id_country,
            'id_level_1_sub_division': City.id_level_1_sub_division,
            'id_level_2_sub_division': City.id_level_2_sub_division,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            (Level2SubDivision, Level2SubDivision.id_, City.id_level_2_sub_division),
            (Level1SubDivision, Level1SubDivision.id_, City.id_level_1_sub_division),
            (Country, Country.id_, City.id_country),
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = City.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        cities_details = []
        for result in results:
            city_details = result.City.get_details()
            city_details['country_details'] = result.Country.get_details()\
                if result.Country else None
            city_details['level_1_sub_division_details'] = result.Level1SubDivision.get_details()\
                if result.Country else None
            city_details['level_2_sub_division_details'] = result.Level2SubDivision.get_details()\
                if result.Country else None
            cities_details.append(city_details)

        return cities_details

    def get_all(params={}):
        return CityActions.get_cities_details(params=params)


class DesignationActions():
    def get_designations_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Designation.id_,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Designation.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        designations_details = []
        for result in results:
            designation_details = result.Designation.get_details()
            designations_details.append(designation_details)

        return designations_details

    def create(data):
        """
        Method creates a new designation with the data.
        Returns : Dict
        """
        errors = []
        designation = Designation.filter_objects_by_keywords(
            {'name': data['name']},
            first_one=True
        )
        if designation:
            errors.append({
                'field': 'data.name',
                'description': 'Designation already in use',
            })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        # Create the model/row in the database
        designation = Designation(data)

        params = {
            'id_': str(designation.id_)
        }

        return DesignationActions.get_designations_details(params=params)

    def get_all(params={}):
        return DesignationActions.get_designations_details(params=params)

    def get(id_):
        designation = Designation.get_one(id_, with_organization=False)
        if not designation:
            raise ResourceNotFound

        params = {
            'id_': str(designation.id_)
        }

        return DesignationActions.get_designations_details(params=params)

    def update(id_, data):
        designation = Designation.get_one(id_, with_organization=False)
        if not designation:
            raise ResourceNotFound

        errors = []
        if 'name' in data and data['name']:
            old_designation = Designation.filter_objects_by_keywords(
                {'name': data['name']},
                first_one=True
            )
            if old_designation and designation.id_ != old_designation.id_:
                errors.append({
                    'field': 'data.name',
                    'description': 'Designation already in use',
                })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        designation.update(data)

        params = {
            'id_': str(designation.id_)
        }

        return DesignationActions.get_designations_details(params=params)

    def delete(id_):
        designation = Designation.get_one(id_, with_organization=False)
        if not designation:
            raise ResourceNotFound

        designation.soft_delete()

        return None


class DomainActions():
    def get_all_domain_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': Domain.id_,
        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = Domain.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        if 'q' in params and params['q']:
            or_filters = []
            filter_string = '%'
            for each_char in params['q']:
                filter_string = filter_string + each_char + '%'

            or_filters.append(
                Domain.name.ilike(filter_string)
            )

            if or_filters:
                q = q.filter(
                    or_(*tuple(or_filters))
                )

        # Get the count before applying pagination
        count = q.count()

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object
        # ids_user = []
        # for result in results:
        #     ids_user.append(result.User.id_)

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with User,
        # create result map, else create users_details.
        domains_details = []
        for result in results:
            domain_details = result.Domain.get_details()
            domains_details.append(domain_details)

        return domains_details

    def create(data):
        # TODO: Is update_time required?
        domain = Domain(data, update_time=True)

        errors = []

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return domain.get_details()

    def get_all(params={}):
        return DomainActions.get_all_domain_details(params)

    def get(id_):
        domain = Domain.get_one(id_, with_organization=False)
        if not domain:
            raise ResourceNotFound

        return domain.get_details()

    def update(id_, data):
        domain = Domain.get_one(id_, with_organization=False)
        if domain is None:
            raise ResourceNotFound

        domain.update(data)

        return domain.get_details()

    def delete(id_):
        domain = Domain.get_one(id_, with_organization=False)
        if domain is None:
            raise ResourceNotFound

        domain.soft_delete()

        return {}


class DomainScoreServiceActions():
    def create(data):
        domain_score_service = DomainScoreService(data, update_time=True)

        errors = []

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return domain_score_service.get_details()

    def get_all(params={}):
        domain_score_service = DomainScoreService.get_all_objects_details(status=None)

        return domain_score_service

    def get(id_):
        domain_score_service = DomainScoreService.get_one(id_, with_organization=False)
        if not domain_score_service:
            raise ResourceNotFound

        return domain_score_service.get_details()

    def update(id_, data):
        domain_score_service = DomainScoreService.get_one(id_, with_organization=False)
        if domain_score_service is None:
            raise ResourceNotFound

        domain_score_service.update(data)

        return domain_score_service.get_details()

    def delete(id_):
        domain_score_service = DomainScoreService.get_one(id_, with_organization=False)
        if domain_score_service is None:
            raise ResourceNotFound

        domain_score_service.soft_delete()

        return {}


class WarmupServiceActions():
    def create(data):
        warmup_service = WarmupService(data, update_time=True)

        errors = []
        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return warmup_service.get_details()

    def get_all(params={}):
        warmup_service = WarmupService.get_all_objects_details(status=None)

        return warmup_service

    def get(id_):
        warmup_service = WarmupService.get_one(id_, with_organization=False)
        if not warmup_service:
            raise ResourceNotFound

        return warmup_service.get_details()

    def update(id_, data):
        warmup_service = WarmupService.get_one(id_, with_organization=False)
        if warmup_service is None:
            raise ResourceNotFound

        warmup_service.update(data)

        return warmup_service.get_details()

    def delete(id_):
        warmup_service = WarmupService.get_one(id_, with_organization=False)
        if warmup_service is None:
            raise ResourceNotFound

        warmup_service.soft_delete()

        return {}


class DomainScoreActions():
    def _get_foreign_key_validation_errors(data):
        errors = []

        if data.get('id_domain'):
            # if WarmupService.get_one(data['id_domain']) is None:
            if Domain.get_one(data['id_domain']) is None:
                errors.append({
                    'field': 'data.id_domain',
                    'description': 'Domain with that ID does not exist',
                })

        if data.get('id_domain_score_service'):
            if DomainScoreService.get_one(data['id_domain_score_service']) is None:
                errors.append({
                    'field': 'data.id_domain_score_service',
                    'description': 'Domain Score Service with that ID does not exist',
                })

        return errors

    def create(data):
        domain_score = DomainScore(data, update_time=True)

        # Semantic validation
        errors = DomainScoreActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        return domain_score.get_details()

    def get_all(params={}):
        domain_score = DomainScore.get_all_objects_details(status=None)

        return domain_score

    def get(id_):
        domain_score = DomainScore.get_one(id_, with_organization=False)
        if not domain_score:
            raise ResourceNotFound

        return domain_score.get_details()

    def update(id_, data):
        domain_score = DomainScore.get_one(id_, with_organization=False)
        if domain_score is None:
            raise ResourceNotFound

        # Semantic validation
        errors = DomainScoreActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        domain_score.update(data)

        return domain_score.get_details()

    def delete(id_):
        domain_score = DomainScore.get_one(id_, with_organization=False)
        if domain_score is None:
            raise ResourceNotFound

        domain_score.soft_delete()

        return {}


class CampaignActions():
    def _get_foreign_key_validation_errors(data):
        errors = []

        if data.get('id_exhibit_app'):
            if Domain.get_one(data['id_exhibit_app']) is None:
                errors.append({
                    'field': 'data.id_exhibit_app',
                    'description': 'Exhibit app with that ID does not exist',
                })

        return errors

    def _get_mail_accounts_validation_errors(campaign, req_mail_accounts):
        """
        campaign should be None if this is called during creation.
        """

        errors = []
        for req_mail_account_index, req_mail_account in enumerate(req_mail_accounts):
            # Check if mail account exists and is active
            mail_account = MailAccount.filter(
                filters={
                    'id_': req_mail_account['id_'],
                },
                get_details=False,
                first_item=True,
            )

            if not mail_account:
                errors.append({
                    'field': f'data.mail_accounts.{req_mail_account_index}.id_',
                    'description': 'Mail account does not exist',
                })
                continue


            # TODO: Check if mail account is added already


            # TODO: Check if total outgoing mail limit is over 50
            # TODO: Check if mail account has connected Gmail API

        return errors

    def _get_templates_validation_errors(campaign, ids_template):
        """
        campaign should be None if this is called during creation.
        """

        errors = []
        for index, id_template in enumerate(ids_template):
            # Check if template exists and is active
            template = Template.filter(
                filters={
                    'id_': id_template,
                },
                get_details=False,
                first_item=True,
            )

            if not template:
                errors.append({
                    'field': f'data.ids_template.{index}',
                    'description': 'Template does not exist',
                })

        return errors

    def _get_session_validation_errors(sessions, existing_sessions=[]):
        # For each timing, check if timing start time < end time
        # For each timing, check if timing start time + 30 minutes < end time
        # For each timing, check for overlaps
        existing_session_week_day_timings_map = existing_map = {}
        for existing_session in existing_sessions:
            existing_map[existing_session['weekday']] = list(map(
                lambda x: (
                    datetime.strptime(x['start_time'], '%H:%M'),
                    datetime.strptime(x['end_time'], '%H:%M'),
                ),
                existing_session['timings'],
            ))

        ic(existing_map)

        errors = []
        for session_index, session in enumerate(sessions):
            previous_timings = []   # To check for overlaps

            # Add timings that are already present in the database
            previous_timings += existing_map.get(session['weekday'], [])
            # ic(existing_map[session['weekday']])
            ic(previous_timings)

            for timing_index, timing in enumerate(session.get('timings', [])):
                # Convert the time strings to actual times
                start_time = datetime.strptime(timing['start_time'], '%H:%M')
                end_time = datetime.strptime(timing['end_time'], '%H:%M')

                # Start time not before end time?
                if end_time <= start_time:
                    errors.append({
                        'field': f'data.sessions.{session_index}.timings.{timing_index}',
                        'description': 'End time should be after the start time',
                    })
                    continue

                # Session duration shouldn't be smaller than 30 minutes
                if end_time < start_time + timedelta(minutes=30):
                    errors.append({
                        'field': f'data.sessions.{session_index}.timings.{timing_index}',
                        'description': 'The session should be at least 30 minutes long',
                    })
                    continue

                # Check for overlaps
                if len(previous_timings) > 0:
                    for (previous_start_time, previous_end_time) in previous_timings:
                        is_start_time_in_between = (
                            start_time >= previous_start_time and start_time < previous_end_time
                        )

                        is_end_time_in_between = (
                            end_time > previous_start_time and end_time <= previous_end_time
                        )

                        encompasses_the_other_session = (
                            start_time < previous_start_time and end_time > previous_end_time
                        )

                        if is_start_time_in_between or is_end_time_in_between or\
                                encompasses_the_other_session:
                            errors.append({
                                'field': f'data.sessions.{session_index}.timings.{timing_index}',
                                'description': 'Session overlaps with another session',
                            })

                            # Overlapping with one previous session is enough
                            break

                previous_timings.append((start_time, end_time))

        return errors

    def _get_details(id_campaign):
        """
        Returns everything except the sessions details. Use the other function
        below to retrieve those details.
        """

        campaign_details = Campaign.filter(
            filters={
                'id_': id_campaign,
            },
            joins=[
                (User, 'id_creator_user', 'creator_user_details'),
                (ExhibitApp, 'id_exhibit_app', 'exhibit_app_details'),
            ],
            bridge_joins=[
                {
                    'bridge_model': CampaignBridgeLead,
                    'secondary_model': Lead,
                    'bridge_primary_id': 'id_campaign',
                    'bridge_secondary_id': 'id_lead',
                    'details_list_key': 'campaign_leads_details',
                },
                {
                    'bridge_model': CampaignBridgeMailAccount,
                    'secondary_model': MailAccount,
                    'bridge_primary_id': 'id_campaign',
                    'bridge_secondary_id': 'id_mail_account',
                    'details_list_key': 'mail_accounts_details',
                    'bridge_details_key': 'bridge_details',
                },
                {
                    'bridge_model': CampaignBridgeTemplate,
                    'secondary_model': Template,
                    'bridge_primary_id': 'id_campaign',
                    'bridge_secondary_id': 'id_template',
                    'details_list_key': 'templates_details',
                    'bridge_details_key': 'bridge_details',
                },
            ],
            first_item=True,
        )

        return campaign_details

    def _get_sessions_details(id_campaign):
        # Get the week day session details
        sessions = CampaignWeekDaySession.filter_objects_by_keywords(
            {
                'id_campaign': id_campaign,
            }
        )

        week_day_timings_map = {}
        # Step 1 - Create the following map first:
        # {
        #   0: [ { 'start_time': '8:00', 'end_time': '10:00' } ]
        # }
        for session in sessions:
            if session.week_day not in week_day_timings_map:
                week_day_timings_map[session.week_day] = []

            week_day_timings_map[session.week_day].append({
                'start_time': serialize_datetime(session.start_time, '%H:%M'),
                'end_time': serialize_datetime(session.end_time, '%H:%M'),
            })

        sessions_details = []
        # Step 2 - Convert the map into a list of objects - response format
        for week_day, timings in week_day_timings_map.items():
            sessions_details.append({
                'weekday': week_day,
                'timings': timings,
            })

        return sessions_details

    def get_all(params={}):
        # campaign = Campaign.get_all_objects_details(status=None)

        campaigns_details = Campaign.filter(
            # filters={
            #     'id_': 3,
            # },
            pagination={
                'page': params.get('page'),
                'page_size': params.get('page_size'),
            },
            reverse_order=False,
            joins=[
                # (User, Campaign.id_creator_user, User.id_)
                (User, 'id_creator_user', 'creator_user_details'),
            ],
            bridge_joins=[
                {
                    'bridge_model': CampaignBridgeLead,
                    'secondary_model': Lead,
                    'bridge_primary_id': 'id_campaign',
                    'bridge_secondary_id': 'id_lead',
                    'details_list_key': 'campaign_leads_details',
                }
            ],
            first_item=False,
        )

        return campaigns_details

    def get(id_):
        campaign_details = CampaignActions._get_details(id_)
        if not campaign_details:
            raise ResourceNotFound

        sessions_details = CampaignActions._get_sessions_details(id_)

        campaign_details['sessions_details'] = sessions_details

        return campaign_details

    def create(data):
        # Campaigns are inactive by default
        data['status'] = 'inactive'

        # Semantic validation
        errors = []

        foreign_key_validation_errors = CampaignActions._get_foreign_key_validation_errors(data)
        session_validation_errors = CampaignActions._get_session_validation_errors(
            data.get('sessions', []),
        )
        mail_account_validation_errors = CampaignActions._get_mail_accounts_validation_errors(
            None,       # campaign
            data.get('mail_accounts', []),
        )
        template_validation_errors = CampaignActions._get_templates_validation_errors(
            None,       # campaign
            data.get('ids_template', []),
        )
        errors += foreign_key_validation_errors
        errors += session_validation_errors
        errors += mail_account_validation_errors
        errors += template_validation_errors

        if errors:
            raise InvalidRequestData(errors)

        sessions_request_data = data.pop('sessions', [])
        mas_request_data = data.pop('mail_accounts', [])
        requested_template_ids = data.pop('ids_template', [])

        # 1. Create the campaign
        campaign = Campaign(data, update_time=True)
        db.session.add(campaign)
        db.session.flush()  # To use the ID below

        # 2. Add the sessions
        for session_request_data in sessions_request_data:
            for timing in session_request_data.get('timings', []):
                session_data = {
                    'start_time': timing['start_time'],
                    'end_time': timing['end_time'],
                    'week_day': session_request_data['weekday'],
                    'id_campaign': campaign.id_,
                }

                # create a session entry
                campaign_week_day_session = CampaignWeekDaySession(session_data)
                db.session.add(campaign_week_day_session)

        # 3. Add the mail accounts
        # ma - mail_account
        # mas - mail_accounts
        for ma_index, ma_request_data in enumerate(mas_request_data):
            data = {
                'id_campaign': campaign.id_,
                'id_mail_account': ma_request_data['id_'],
                'maximum_emails_per_day': ma_request_data['maximum_emails_per_day'],
            }
            campaign_bridge_mail_account = CampaignBridgeMailAccount(data)
            db.session.add(campaign_bridge_mail_account)

        # 4. Add the templates
        for index, id_template in enumerate(requested_template_ids):
            data = {
                'id_campaign': campaign.id_,
                'id_template': id_template,
            }
            campaign_bridge_template = CampaignBridgeTemplate(data)
            db.session.add(campaign_bridge_template)

        return CampaignActions._get_details(campaign.id_)
        # return campaign.get_details()

    def update(id_, data):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        # Semantic validation
        errors = []

        foreign_key_validation_errors = CampaignActions._get_foreign_key_validation_errors(data)
        existing_sessions_details = CampaignActions._get_sessions_details(id_)
        ic(existing_sessions_details)
        session_validation_errors = CampaignActions._get_session_validation_errors(
            data.get('sessions', []),
            existing_sessions=existing_sessions_details,
        )
        mail_account_validation_errors = CampaignActions._get_mail_accounts_validation_errors(
            campaign,
            data.get('mail_accounts', [])
        )
        template_validation_errors = CampaignActions._get_templates_validation_errors(
            campaign,
            data.get('ids_template', [])
        )
        errors += foreign_key_validation_errors
        errors += session_validation_errors
        errors += mail_account_validation_errors
        errors += template_validation_errors

        if errors:
            raise InvalidRequestData(errors)

        sessions_request_data = data.pop('sessions', [])
        mas_request_data = data.pop('mail_accounts', [])
        requested_template_ids = data.pop('ids_template', [])

        # 1. Update the campaign
        campaign.update(data)

        # 2. Add the sessions
        for session_index, session_request_data in enumerate(sessions_request_data):
            for timing_index, timing in enumerate(session_request_data.get('timings', [])):
                session_data = {
                    'start_time': timing['start_time'],
                    'end_time': timing['end_time'],
                    'week_day': session_request_data['weekday'],
                    'id_campaign': campaign.id_,
                }

                if 'id_campaign_week_day_session' in timing:
                    existing_session = CampaignWeekDaySession.get_one(
                        timing['id_campaign_week_day_session']
                    )

                    if existing_session is None:
                        raise InvalidRequestData(errors = [{
                            'field': f'data.sessions.{session_index}.timings.{timing_index}.id_campaign_week_day_session',
                            'description': 'The campaign week day session with that ID does not exist'
                        }])

                    # Campaign ID is not needed for update
                    session_data.pop('id_campaign')

                    if timing.get('is_deleted') == True:
                        # Delete the entry
                        existing_session.soft_delete()
                    else:
                        # Update the entry
                        existing_session.update(session_data)
                else:
                    # create the session entry
                    campaign_week_day_session = CampaignWeekDaySession(session_data)
                    db.session.add(campaign_week_day_session)

        # 3. Add the mail accounts
        # ma - mail_account
        # mas - mail_accounts
        for ma_index, ma_request_data in enumerate(mas_request_data):
            results = CampaignBridgeMailAccount.filter(
                filters={
                    'id_campaign': campaign.id_,
                    'id_mail_account': ma_request_data['id_'],

                    # TODO: Following value can be None or False
                    'is_removed_from_campaign': None,
                },
                get_details=False,
                first_item=True,
            )
            campaign_bridge_mail_account = results[0] if results else None
            ic(campaign_bridge_mail_account)

            # If row is present, update it, else create it
            if campaign_bridge_mail_account is not None:
                campaign_bridge_mail_account.update({
                    'maximum_emails_per_day': ma_request_data['maximum_emails_per_day'],
                })
            else:
                data = {
                    'id_campaign': campaign.id_,
                    'id_mail_account': ma_request_data['id_'],
                    'maximum_emails_per_day': ma_request_data['maximum_emails_per_day'],
                }
                campaign_bridge_mail_account = CampaignBridgeMailAccount(data)
                db.session.add(campaign_bridge_mail_account)

        # 4. Add templates if not there, remove if not in request data
        campaign_bridge_template_rows = CampaignBridgeTemplate.filter(
            filters={
                'id_campaign': campaign.id_,
                # TODO: Following value can be None or False
                'is_removed_from_campaign': None,
            },
            get_details=False,
        )
        existing_bridge_row_ids = [ row.id_ for row in campaign_bridge_template_rows ]
        to_be_deleted_ids = existing_bridge_row_ids.copy()
        for index, id_template in enumerate(requested_template_ids):
            # Add row only if it doesn't exist already
            if id_template not in existing_bridge_row_ids:
                data = {
                    'id_campaign': campaign.id_,
                    'id_template': id_template,
                }
                campaign_bridge_template = CampaignBridgeTemplate(data)
                db.session.add(campaign_bridge_template)
            else:
                # Row already exists so ignore
                to_be_deleted_ids.remove(id_template)

        # 4.1 Delete existing templates if not specified in the request data
        for to_be_deleted_id in to_be_deleted_ids:
            campaign_bridge_template = CampaignBridgeTemplate.get_one(
                to_be_deleted_id,
                with_organization=False,
            )
            campaign_bridge_template.soft_delete()

        details = CampaignActions._get_details(campaign.id_)
        sessions_details = CampaignActions._get_sessions_details(campaign.id_)
        ic(campaign.id_, details, sessions_details)
        details['sessions_details'] = sessions_details

        return details

    def start(id_):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        # TODO: Temporarily enabling starting ended campaigns for testing purposes
        # # Check if campaign is inactive
        # if campaign.status != 'inactive':
        #     raise InvalidRequestData([{
        #         'field': 'id',
        #         'description': 'Cannot start a campaign that is already running or is ended',
        #     }])

        campaign_details = CampaignActions._get_details(id_)
        sessions_details = CampaignActions._get_sessions_details(id_)

        errors = []
        # Check if at least one template is present
        if not campaign_details.get('templates_details'):
            errors.append({
                'field': 'id',
                'description': 'Campaign does not have an active template',
            })

        # Check if at least one session with one timing is present
        has_session = len(sessions_details) > 0
        has_timing = False
        if has_session:
            has_timing = len(sessions_details[0]['timings']) > 0
        if not (has_session and has_timing):
            errors.append({
                'field': 'id',
                'description': 'Campaign does not have an active session timing',
            })

        # Check if one active sender account is present
        if not campaign_details.get('mail_accounts_details'):
            errors.append({
                'field': 'id',
                'description': 'Campaign does not have a sender mail account',
            })

        # Check if an exhibit app is present - only for Zephony
        if not campaign_details.get('exhibit_app_details'):
            errors.append({
                'field': 'id',
                'description': 'Campaign does not have an exhibit app',
            })

        if errors:
            raise InvalidRequestData(errors)

        campaign.status = 'active'
        campaign.start_date = datetime.now()

        # Schedule all the emails
        CampaignActions.schedule(id_, '2023-12-14')

        return campaign.get_details()

    def schedule(id_, date_string=None):
        """
        Schedule email slots for a particular date (YYY-MM-DD).
        """

        if date_string is None:
            date = datetime.now() + timedelta(days=1)
        else:
            date = normalize_date(date_string)

        # TODO: Check for past date
        if date < datetime.now():
            raise InvalidDateTimeError

        weekday = date.weekday()

        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        errors = []
        # TODO: Temporarily  disable this
        # # Check if campaign is inactive
        # if campaign.status != 'inactive':
        #     errors.append({
        #         'field': 'id',
        #         'description': 'Cannot schedule for a campaign if it is not inactive',
        #     })

        if errors:
            raise InvalidRequestData(errors)


        campaign_details = CampaignActions._get_details(campaign.id_)
        sessions_details = CampaignActions._get_sessions_details(campaign.id_)
        campaign_details['sessions_details'] = sessions_details

        # Temporary code to schedule a campaign
        data = {
            'mail_accounts': [],
            'max_emails': 0,
            'total_minutes': 0,
            'slots': [],    # { minute, lead_email }
        }

        # Get all the mail accounts
        for mail_account_details in campaign_details['mail_accounts_details']:
            data['mail_accounts'].append({
                'email': mail_account_details['email'],
                'max_count': mail_account_details['bridge_details']['maximum_emails_per_day'],
            })
            data['max_emails'] += mail_account_details['bridge_details']['maximum_emails_per_day']

        # Get the total minutes of tomorrow's session
        day_session = next(
            (
                x for x in campaign_details['sessions_details'] if x['weekday']==weekday
            ),
            None,
        )
        if day_session is None:
            date_str = serialize_datetime(date, date_format)
            raise InvalidRequestData([{
                'field': 'id',
                'description': f'No session is found for {date_str}',
            }])

        for timing in day_session['timings']:
            start_time = datetime.strptime(timing['start_time'], '%H:%M')
            end_time = datetime.strptime(timing['end_time'], '%H:%M')
            time_difference = end_time - start_time

            data['total_minutes'] += int(time_difference.total_seconds() / 60)

        # Randomly pick X slots in T minutes
        random_minutes = []
        for i in range(0, data['max_emails']):
            random_minute = random.randint(0, data['total_minutes'])

            # If we offset by >= 30 we may get the same number as minimum
            # session length is 30
            offset = 25
            if random_minute in random_minutes:
                # This new adjustment can still collide with an existing value
                # but we're ignoring this problem
                random_minute = data['total_minutes'] % (random_minute + offset)

            random_minutes.append(random_minute)

        # Sort so that emails fill up the early slots first
        random_minutes = sorted(random_minutes)

        for random_minute in random_minutes:
            data['slots'].append({
                'minute': random_minute,
            })

        data['sender_list'] = CampaignActions.get_sender_list(
            campaign_details['mail_accounts_details']
        )

        # Get max X leads and fill in those slots
        templates_details = campaign_details['templates_details']

        bridge_rows_details = CampaignBridgeLead.filter(
            filters={
                'id_campaign': campaign.id_,
            },
            joins=[
                (Lead, 'id_lead', 'lead_details'),
            ],
            pagination={
                'page': '1',
                'page_size': f"{data['max_emails']}",
            },
        )
        for i, slot in enumerate(data['slots']):
            slot['sender_email'] = data['sender_list'][i]['email']
            slot['id_mail_account'] = data['sender_list'][i]['id']
            chosen_template = templates_details[
                i % len(templates_details)
            ]
            slot['id_template'] = chosen_template['id']

            # Get the absolute datetime
            past_unused_minutes = 0
            past_absolute_end_minute = 0
            original_minute = slot['minute']
            non_session_duration = 0
            for timing in day_session['timings']:
                start_time = datetime.strptime(timing['start_time'], '%H:%M').time()
                end_time = datetime.strptime(timing['end_time'], '%H:%M').time()

                current_absolute_start_minute = start_time.hour * 60 + start_time.minute
                current_absolute_end_minute = end_time.hour * 60 + end_time.minute
                past_unused_minutes += (
                    current_absolute_start_minute - past_absolute_end_minute
                )
                absolute_minute = original_minute + past_unused_minutes

                if absolute_minute > current_absolute_end_minute:
                    past_absolute_end_minute = current_absolute_end_minute
                    continue

                slot['scheduled_for'] = serialize_datetime(
                    date + timedelta(minutes=absolute_minute),
                    datetime_format,
                )
                break

            if i < len(bridge_rows_details):
                slot['email'] = bridge_rows_details[i]['lead_details']['email']
                slot['id_lead'] = bridge_rows_details[i]['lead_details']['id']

            # Create the email and email_thread entries
            email_thread_data = {
                'id_campaign_bridge_lead': (
                    bridge_rows_details[i]['id']
                        if i < len(bridge_rows_details) else
                    None
                ),
                'id_campaign_bridge_mail_account': data['sender_list'][i]['bridge_details']['id'],
                'id_campaign': campaign.id_,
            }

            email_thread = EmailThread(email_thread_data)
            db.session.add(email_thread)
            db.session.flush()

            # scheduled_at_utc = normalize_date(slot['scheduled_for'])
            ist_timezone = ZoneInfo('Asia/Kolkata')  # Indian Standard Time
            ist_date_str = slot['scheduled_for']
            # ic(slot['scheduled_for'])
            ist_date = datetime.fromisoformat(ist_date_str).replace(tzinfo=ist_timezone)

            # Convert to UTC
            utc_timezone = ZoneInfo('UTC')
            utc_date = ist_date.astimezone(utc_timezone)
            # ic(utc_date)

            if i < len(bridge_rows_details):
                lead_details = bridge_rows_details[i]['lead_details']
                lead = Lead.get_one(lead_details['id'])
                (rendered_title, rendered_body) = LeadActions.get_rendered_template(
                    lead,
                    chosen_template['id'],
                    'zephony.in',       # TODO
                )
            else:
                rendered_title = None
                rendered_body = None

            email_data = {
                'title': rendered_title,
                'body': rendered_body,
                'scheduled_at': utc_date,
                'sent_at': None,
                'id_email_thread': email_thread.id_,
                'id_campaign': campaign.id_,
                'id_template': chosen_template['id'],
            }

            email = Email(email_data)
            db.session.add(email)
            # db.session.rollback()

            if 'id_lead' in slot:
                job = scheduler.enqueue_at(
                    utc_date,
                    job_send_email,
                    # TODO: Fix
                    slot['id_lead'],
                    {
                        'id_template': chosen_template['id'],
                        'id_mail_account': slot['id_mail_account'],
                    },
                )
                ic(job, job.id)
                email.job_id = job.id

        return data

    def get_sender_list(mail_accounts_details):
        mail_accounts_details = sorted(
            mail_accounts_details,
            key=lambda x: x['bridge_details']['maximum_emails_per_day'],
            reverse=True,
        )

        sender_list = []
        for mail_account_details in mail_accounts_details:
            email_address = mail_account_details['email']
            max_emails = mail_account_details['bridge_details']['maximum_emails_per_day']

            if len(sender_list) == 0:
                first_email = True
            else:
                first_email = False

            inserted_count = 0
            for i in range(0, max_emails):
                if first_email:
                    sender_list.append(mail_account_details)
                else:
                    sender_list.insert(
                        (
                            i * int(len(sender_list) / max_emails)
                        ) + inserted_count,
                        mail_account_details,
                    )
                    inserted_count += 1

        return sender_list

    def end(id_, data):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        errors = []
        # Check if campaign is running
        if campaign.status != 'active':
            errors.append({
                'field': 'id',
                'description': 'Cannot end a campaign that is not currently running',
            })

        if errors:
            raise InvalidRequestData(errors)

        campaign.status = 'ended'
        campaign.end_date = datetime.now()
        campaign.end_type = data['end_type']
        # TODO: Set id_user_ended_by

        # Cancel all the emails that are not yet sent and their jobs
        emails = Email.filter(
            filters={
                'id_campaign': campaign.id_,
                'is_cancelled': False,
            },
            get_details=False,
        )
        for email in emails:
            # Update the email entry
            email.is_cancelled = True
            email.cancelled_at = datetime.now()

            # Cancel the rq job if it has a job
            if email.job_id:
                cancel_job(
                    # queue,
                    email.job_id,
                    connection=redis_connection,
                )




        # Active jobs
        # Get the registry of started jobs
        started_job_registry = StartedJobRegistry(queue=queue)
        canceled_job_registry = CanceledJobRegistry(queue=queue)

        # Retrieve the list of active job IDs
        active_job_ids = started_job_registry.get_job_ids()
        canceled_job_ids = canceled_job_registry.get_job_ids()

        # Print the active job IDs
        ic("Active Job IDs:", active_job_ids)
        ic("Canceled Job IDs:", canceled_job_ids)




        return campaign.get_details()

    def add_leads(id_, data):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        errors = []
        # Check if campaign is running or yet to start
        if campaign.status not in ('inactive', 'active'):
            errors.append({
                'field': 'id',
                'description': 'Cannot add leads to an ended campaign',
            })

        # Fetch the leads one by one, validate and add them to the campaign
        non_existent_lead_ids = []
        other_campaign_lead_ids = []
        unsubscribed_lead_ids = []
        for index, id_lead in enumerate(data['ids_lead']):
            lead = Lead.get_one(id_lead)
            # Check if lead is present
            if lead is None:
                non_existent_lead_ids.append(id_lead)
                continue

            # Check if lead has opted out
            if lead.is_unsubscribed:
                unsubscribed_lead_ids.append(id_lead)
                continue

            # Check if lead is part of another campaign
            active_campaign_bridge_lead = CampaignBridgeLead.filter(
                filters={
                    'id_lead': lead.id_,
                    'id_campaign': campaign.id_,
                    'is_deleted': False,
                },
                first_item=True,
            )
            if active_campaign_bridge_lead is not None:
                other_campaign_lead_ids.append(id_lead)
                continue

        if len(non_existent_lead_ids) > 0:
            errors.append({
                'field': f'data.ids_lead',
                'description': f'Leads with IDs {", ".join(map(str, non_existent_lead_ids))} do not exist',
            })

        if len(other_campaign_lead_ids) > 0:
            errors.append({
                'field': f'data.ids_lead',
                'description': f'Leads with IDs {", ".join(map(str, other_campaign_lead_ids))} already exist in a campaign',
            })

        if len(unsubscribed_lead_ids) > 0:
            errors.append({
                'field': f'data.ids_lead',
                'description': f'Leads with IDs {", ".join(map(str, unsubscribed_lead_ids))} have been unsubscribed',
            })

        if errors:
            raise InvalidRequestData(errors)

        new_campaign_bridge_lead_rows = []
        # After all validation passes, add the leads to the campaign
        for index, id_lead in enumerate(data['ids_lead']):
            bridge_data = {
                'id_campaign': campaign.id_,
                'id_lead': id_lead,
            }
            campaign_bridge_lead = CampaignBridgeLead(bridge_data)
            db.session.add(campaign_bridge_lead)

            if campaign.status == 'active':
                new_campaign_bridge_lead_rows.append(campaign_bridge_lead)

        # If it's a running campaign:
        # 1. Get the next len(new_campaign_bridge_lead_rows) empty email rows
        # 2. For each email row, get the corresponding email_thread row
        # 3. Add the bridge ID to the email thread row
        # 4. Schedule the email and update the email row

        if campaign.status == 'active':
            empty_email_rows = Email.filter(
                filters={
                    'id_campaign': campaign.id_,
                    'is_cancelled': False,
                    'job_id': None,
                    # 'scheduled_at': False,  # TODO
                },
                joins=[
                    (EmailThread, 'id_email_thread'),
                ],
                order_by='scheduled_at',
                get_details=False,
            )

            for empty_email_row in empty_email_rows:
                if len(new_campaign_bridge_lead_rows) == 0:
                    # No more lead to fill the slots with
                    break

                campaign_bridge_lead = new_campaign_bridge_lead_rows.pop(0)
                lead = Lead.get_one(
                    campaign_bridge_lead.id_lead,
                    with_organization=False,
                )

                # Update the email thread row
                empty_email_row.EmailThread.id_campaign_bridge_lead = campaign_bridge_lead.id_

                # Schedule the job and update the email row
                (rendered_title, rendered_body) = LeadActions.get_rendered_template(
                    lead,
                    empty_email_row.Email.id_template,
                    'zephony.in',       # TODO
                )
                job = scheduler.enqueue_at(
                    empty_email_row.Email.scheduled_at,
                    job_send_email,
                    # TODO: Fix
                    lead.id_,
                )
                email = empty_email_row.Email.update({
                    'title': rendered_title,
                    'body': rendered_body,
                    'job_id': job.id,
                })

                ic(empty_email_row.Email, empty_email_row.Email.id_)
                ic(empty_email_row.EmailThread, empty_email_row.EmailThread.id_)

        # TODO - TEMP
        # db.session.rollback()
        return CampaignActions._get_details(campaign.id_)

    def remove_leads(id_, data):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        errors = []
        # Check if campaign is running or yet to start
        if campaign.status in ('active'):
            errors.append({
                'field': 'id',
                'description': 'Cannot remove leads from a running campaign',
            })

        # Fetch the leads one by one, validate and add them to the campaign
        non_existent_lead_ids = []
        not_part_of_campaign_lead_ids = []
        for index, id_lead in enumerate(data['ids_lead']):
            lead = Lead.get_one(id_lead)
            if lead is None:
                non_existent_lead_ids.append(id_lead)
                continue

            # Check if lead is part of that campaign
            results = CampaignBridgeLead.filter(
                filters={
                    'id_lead': lead.id_,
                    'id_campaign': campaign.id_,
                    'is_deleted': False,
                },
                first_item=True,
                get_details=False,
            )

            active_campaign_bridge_lead = results[0] if results else None

            if active_campaign_bridge_lead is None:
                not_part_of_campaign_lead_ids.append(id_lead)
                continue


        if len(non_existent_lead_ids) > 0:
            errors.append({
                'field': f'data.ids_lead',
                'description': f'Leads with IDs {", ".join(map(str, non_existent_lead_ids))} do not exist',
            })

        if len(not_part_of_campaign_lead_ids) > 0:
            errors.append({
                'field': f'data.ids_lead',
                'description': f'Leads with IDs {", ".join(map(str, not_part_of_campaign_lead_ids))} are not part of the campaign',
            })

        if errors:
            raise InvalidRequestData(errors)


        for index, id_lead in enumerate(data['ids_lead']):
            results = CampaignBridgeLead.filter(
                filters={
                    'id_campaign': campaign.id_,
                    'id_lead': id_lead,
                },
                first_item=True,
                get_details=False,
            )

            campaign_bridge_lead = results[0]
            campaign_bridge_lead.soft_delete()

        return CampaignActions._get_details(campaign.id_)

    def delete(id_):
        campaign = Campaign.get_one(id_, with_organization=False)
        if campaign is None:
            raise ResourceNotFound

        errors = []
        # Check if campaign is running
        if campaign.status == 'active':
            errors.append({
                'field': 'id',
                'description': 'Cannot delete a running campaign',
            })

        if errors:
            raise InvalidRequestData(errors)

        campaign.soft_delete()

        return {}


class EmailServiceProviderActions():
    def create(data):
        email_service_provider = EmailServiceProvider(data, update_time=True)

        errors = []

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return email_service_provider.get_details()

    def get_all(params={}):
        email_service_provider = EmailServiceProvider.get_all_objects_details(status=None)

        return email_service_provider

    def get(id_):
        email_service_provider = EmailServiceProvider.get_one(id_, with_organization=False)
        if not email_service_provider:
            raise ResourceNotFound

        return email_service_provider.get_details()

    def update(id_, data):
        email_service_provider = EmailServiceProvider.get_one(id_, with_organization=False)
        if email_service_provider is None:
            raise ResourceNotFound

        email_service_provider.update(data)

        return email_service_provider.get_details()

    def delete(id_):
        email_service_provider = EmailServiceProvider.get_one(id_, with_organization=False)
        if email_service_provider is None:
            raise ResourceNotFound

        email_service_provider.soft_delete()

        return {}


class TimezoneActions():
    def get_all(params={}):
        timezone = Timezone.get_all_objects_details(status=None)

        return timezone


class ExhibitAppActions():
    def create(data):
        exhibit_app = ExhibitApp(data, update_time=True)

        errors = []

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return exhibit_app.get_details()

    def get_all(params={}):
        exhibit_app = ExhibitApp.get_all_objects_details(status=None)

        return exhibit_app

    def get(id_):
        exhibit_app = ExhibitApp.get_one(id_, with_organization=False)
        if not exhibit_app:
            raise ResourceNotFound

        return exhibit_app.get_details()

    def update(id_, data):
        exhibit_app = ExhibitApp.get_one(id_, with_organization=False)
        if exhibit_app is None:
            raise ResourceNotFound

        exhibit_app.update(data)

        return exhibit_app.get_details()

    def delete(id_):
        exhibit_app = ExhibitApp.get_one(id_, with_organization=False)
        if exhibit_app is None:
            raise ResourceNotFound

        exhibit_app.soft_delete()

        return {}


class MailAccountActions():
    def _get_foreign_key_validation_errors(data):
        errors = []

        if data.get('id_domain'):
            if Domain.get_one(data['id_domain']) is None:
                errors.append({
                    'field': 'data.id_domain',
                    'description': 'Domain with that ID does not exist',
                })

        if data.get('id_warmup_service'):
            if WarmupService.get_one(data['id_warmup_service']) is None:
                errors.append({
                    'field': 'data.id_warmup_service',
                    'description': 'Warmup Service with that ID does not exist',
                })

        if data.get('id_email_service_provider'):
            if EmailServiceProvider.get_one(data['id_email_service_provider']) is None:
                errors.append({
                    'field': 'data.id_email_service_provider',
                    'description': 'ESP with that ID does not exist',
                })

        return errors

    def create(data):
        # Semantic validation
        errors = MailAccountActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        mail_account = MailAccount(data, update_time=True)

        return mail_account.get_details()

    def get_all(params={}):
        mail_account = MailAccount.get_all_objects_details(status=None)

        return mail_account

    def get(id_):
        mail_account = MailAccount.get_one(id_, with_organization=False)
        if not mail_account:
            raise ResourceNotFound

        return mail_account.get_details()

    def update(id_, data):
        mail_account = MailAccount.get_one(id_, with_organization=False)
        if mail_account is None:
            raise ResourceNotFound

        # Semantic validation
        errors = MailAccountActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        mail_account.update(data)

        return mail_account.get_details()

    def delete(id_):
        mail_account = MailAccount.get_one(id_, with_organization=False)
        if mail_account is None:
            raise ResourceNotFound

        mail_account.soft_delete()

        return {}


class TemplateActions():
    def create(data):
        template = Template(data, update_time=True)

        errors = []

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(errors)

        return template.get_details()

    def get_all(params={}):
        template = Template.get_all_objects_details()

        return template

    def get(id_):
        template = Template.get_one(id_, with_organization=False)
        if not template:
            raise ResourceNotFound

        return template.get_details()

    def update(id_, data):
        template = Template.get_one(id_, with_organization=False)
        if template is None:
            raise ResourceNotFound

        template.update(data)

        return template.get_details()

    def delete(id_):
        template = Template.get_one(id_, with_organization=False)
        if template is None:
            raise ResourceNotFound

        template.soft_delete()

        return {}


class StepActions():
    def get_all(params={}):
        steps = Step.query.order_by('id').all()

        steps_details = []
        for step in steps:
            step_details = step.get_details()

            # Get leads count
            step_details['leads_count'] = Lead.query.filter(
                Lead.id_step==step.id_,
                Lead.is_deleted.isnot(True),
                Lead.has_failed_on_step.isnot(True),
            ).count()
            steps_details.append(step_details)

        return steps_details

    def update(id_, data):
        step = Step.get_one(id_, with_organization=False)
        if step is None:
            raise ResourceNotFound

        step.update(data)

        return step.get_details()


class SpintaxVariableActions():
    def _get_foreign_key_validation_errors(data):
        errors = []

        if data.get('id_template'):
            if Template.get_one(data['id_template']) is None:
                errors.append({
                    'field': 'data.id_template',
                    'description': 'Template with that ID does not exist',
                })

        return errors

    def _get_details(id_variable):
        variable_details = SpintaxVariable.filter(
            filters={
                'id_': id_variable,
            },
            joins=[
                (User, 'id_creator_user', 'creator_user_details'),
                (Template, 'id_template', 'template_details'),
                # (SpintaxVariant, 'id_spintax_variant', 'spintax_variants_details'),
            ],
            list_joins=[
                {
                    'secondary_model': SpintaxVariant,
                    'back_reference': 'id_spintax_variable',
                    'details_list_key': 'spintax_variants_details',
                },
            ],
            first_item=True,
        )

        return variable_details

    def create(data):
        # Semantic validation
        errors = SpintaxVariableActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        # Create the spintax variable
        spintax_variable = SpintaxVariable(data)
        db.session.add(spintax_variable)
        db.session.flush()

        # Create the individual spintax variants
        spintax_variants_request_data = data.pop('spintax_variants', [])
        for spintax_variant_data in spintax_variants_request_data:
            variant_data = {
                'text': spintax_variant_data['text'],
                'id_spintax_variable': spintax_variable.id_,
            }
            spintax_variant = SpintaxVariant(variant_data)
            db.session.add(spintax_variant)

        return SpintaxVariableActions._get_details(spintax_variable.id_)

    def get_all(params={}):
        variables_details = SpintaxVariable.filter(
            filters={
                # 'id_': id_variable,
            },
            joins=[
                (User, 'id_creator_user', 'creator_user_details'),
                (Template, 'id_template', 'template_details'),
                # (SpintaxVariant, 'id_spintax_variant', 'spintax_variants_details'),
            ],
            list_joins=[
                {
                    'secondary_model': SpintaxVariant,
                    'back_reference': 'id_spintax_variable',
                    'details_list_key': 'spintax_variants_details',
                },
            ],
        )

        return variables_details

    def get(id_):
        spintax_variable_details = SpintaxVariableActions._get_details(id_)

        if not spintax_variable_details:
            raise ResourceNotFound

        return spintax_variable_details

    def update(id_, data):
        spintax_variable = SpintaxVariable.get_one(id_, with_organization=False)
        if spintax_variable is None:
            raise ResourceNotFound

        # Semantic validation
        errors = SpintaxVariableActions._get_foreign_key_validation_errors(data)
        if errors:
            raise InvalidRequestData(errors)

        spintax_variants_request_data = data.pop('spintax_variants', [])
        spintax_variable.update(data)

        for spintax_variant_data in spintax_variants_request_data:
            if 'id_' not in spintax_variant_data:
                # Create the variant
                variant_data = {
                    'text': spintax_variant_data['text'],
                    'id_spintax_variable': spintax_variable.id_,
                }
                variant = SpintaxVariant(variant_data)
                db.session.add(variant)
            else:
                variant = SpintaxVariant.get_one(
                    spintax_variant_data['id_'],
                    with_organization=False,
                )
                if spintax_variant_data.get('is_deleted') is True:
                    # Delete the variant
                    variant.soft_delete()
                else:
                    # Update the variant
                    variant.update({
                        'text': spintax_variant_data['text'],
                    })

        return SpintaxVariableActions._get_details(spintax_variable.id_)

    def delete(id_):
        spintax_variable = SpintaxVariable.get_one(id_, with_organization=False)
        if spintax_variable is None:
            raise ResourceNotFound

        # TODO: Check for edge cases before allowing delete

        # Delete all the variants first
        variants = SpintaxVariant.filter(
            filters={
                'id_spintax_variable': spintax_variable.id_,
            },
            get_details=False,
        )
        for variant in variants:
            variant.soft_delete()

        spintax_variable.soft_delete()

        return None


class CommonValidations():
    def validate_address(errors, data, address_details_name='address'):
        """
        Here we assume address details are present in the root of the payload data.
        """
        address_details = {}
        old_country = None
        old_level_1_sub_division = None
        old_level_2_sub_division = None
        old_city = None
        if data.get(address_details_name, {}) and data.get(address_details_name, {}).get('id'):
            address = Address.get_one(data[address_details_name].get('id'), with_organization=False)
            address_details['id_country'] = data.get(address_details_name, {}).get('id_country', address.id_country)
            address_details['id_level_1_sub_division'] = data.get(address_details_name, {}).get('id_level_1_sub_division', address.id_level_1_sub_division)
            address_details['id_level_2_sub_division'] = data.get(address_details_name, {}).get('id_level_2_sub_division', address.id_level_2_sub_division)
            address_details['id_city'] = data.get(address_details_name, {}).get('id_city', address.id_city)
        else:
            address_details['id_country'] = data.get(address_details_name, {}).get('id_country')
            address_details['id_level_1_sub_division'] = data.get(address_details_name, {}).get('id_level_1_sub_division')
            address_details['id_level_2_sub_division'] = data.get(address_details_name, {}).get('id_level_2_sub_division')
            address_details['id_city'] = data.get(address_details_name, {}).get('id_city')

        country = None
        level_1_sub_division = None
        level_2_sub_division = None
        city = None
        if address_details['id_country']:
            country = Country.get_one(address_details['id_country'], with_organization=False)
            if not country:
                errors.append({
                    'field': f'data.{address_details_name}.id_country',
                    'description': 'Please select a valid country',
                })

        if address_details['id_level_1_sub_division']:
            level_1_sub_division = Level1SubDivision.get_one(address_details['id_level_1_sub_division'], with_organization=False)
            field = f'data.{address_details_name}.id_level_1_sub_division'
            description = 'Please select a valid State/Province'
            error = {
                'field': field,
                'description': description
            }
            if not level_1_sub_division:
                errors.append(error)
            else:
                if country and country.id_ != level_1_sub_division.id_country and error not in errors:
                    errors.append(error)

        if address_details['id_level_2_sub_division']:
            level_2_sub_division = Level2SubDivision.get_one(address_details['id_level_2_sub_division'], with_organization=False)
            field = f'data.{address_details_name}.id_level_2_sub_division'
            description = 'Please select a valid Region'
            error = {
                'field': field,
                'description': description
            }
            if not level_2_sub_division:
                errors.append(error)
            else:
                if level_1_sub_division and level_1_sub_division.id_ != level_2_sub_division.id_level_1_sub_division and error not in errors:
                    errors.append(error)
                if country and country.id_ != level_2_sub_division.id_country and error not in errors:
                    errors.append(error)

        if address_details['id_city']:
            city = City.get_one(address_details['id_city'], with_organization=False)
            field = f'data.{address_details_name}.id_city'
            description = 'Please select a valid City'
            error = {
                'field': field,
                'description': description
            }
            if not city:
                errors.append(error)
            else:
                if level_2_sub_division and level_2_sub_division.id_ != city.id_level_2_sub_division and error not in errors:
                    errors.append(error)
                if level_1_sub_division and level_1_sub_division.id_ != level_2_sub_division.id_level_1_sub_division and error not in errors:
                    errors.append(error)
                if country and country.id_ != level_2_sub_division.id_country and error not in errors:
                    errors.append(error)

        return errors

    def validate_custom_fields_with_respective_to_object_type(errors, data, id_object_type):
        """
        Here we assume custom fields details are present in the root of the payload data.
        """

        field_types = (
            FieldType.query
            .outerjoin(
                FieldGroup,
                and_(
                    FieldGroup.id_ == FieldType.id_field_group,
                    FieldGroup.is_deleted == False,
                )
            )
            .outerjoin(
                ObjectType,
                and_(
                    ObjectType.id_ == FieldGroup.id_object_type,
                    ObjectType.is_deleted == False,
                )
            )
            .add_entity(FieldGroup)
            .add_entity(FieldType)
            .add_entity(ObjectType)
            .filter(
                FieldType.is_deleted == False,
                ObjectType.id_ == id_object_type,
            )
        ).all()

        valid_field_types = {}
        for each_field_type in field_types:
            valid_field_types[str(each_field_type.FieldType.id_)] = each_field_type.FieldType

        custom_fields_map = {}
        for each_custom_field in data['custom_fields']:
            custom_fields_map[str(each_custom_field['id_field_type'])] = each_custom_field['value']
        data['custom_fields'] = custom_fields_map

        for index, (id_field_type, value) in enumerate(data['custom_fields'].items()):
            if id_field_type not in valid_field_types:
                errors.append({
                    'field': f'data.custom_fields.{index}.id_field_type',
                    'description': 'Custom field is not found or allowed',
                })
                # If invalid key(id_field_type), do not validate the value.
                continue

            # If the try block raises no exception, the value is valid.
            try:
                valid_field_types[id_field_type].validate_field(value)
            except Exception as e:
                logger.error(str(e))
                # errors.append({
                #     'field': f'data.custom_fields.{index}.id_field_type',
                #     'description': f'Invalid value for type {valid_field_types[id_field_type].type_}',
                # })
                errors.append({
                    'field': f'data.custom_fields.{index}.id_field_type',
                    'description': f'{str(e)}',
                })

        return errors


class ExportLeadBasedOnUsernameActions():
    def get(username):
        lead = Lead.filter_objects_by_keywords(
            {'username': username},
            first_one=True
        )
        if not lead:
            raise ResourceNotFound(
                message='Lead details not found'
            )

        params = request.args.to_dict()
        # if 'exhibit_url' in params and params['exhibit_url']:
        #     lead_email_opened_data = {
        #         'type_': 'click',
        #         'id_lead': lead.id_,
        #         'headers': dict(request.headers),
        #         'activity_time': serialize_datetime(datetime.now(), datetime_format),
        #         'exhibit_app_url': unquote(params['exhibit_url']),
        #     }
        #
        #     lead_email_opened = LeadActivity(lead_email_opened_data)
        #     db.session.commit()

        params = {
            'id_': str(lead.id_),
        }

        return LeadActions.get_leads_details(params)[0]


class CommonActions():
    """
    Handles all common or repeated actions to follow DRY principle
    """

    def send_email_to(
        email, subject, template=None, template_data=None, template_string=None,
        send_email_as=None,
    ):
        """
        Send email configuration is set here.
        Returns : Mailgun response
        """
        if not app.config.get('MAILGUN'):
            logger.info(
                f'MailGun config is not present in environment : {app.config.get("APP_ENV")}')
            return None

        # Based on APP_ENV email is sent,
        # If APP_ENV is any of (None or local) => Email is not sent.
        # Else Email is sent to their respective email ID.
        if not app.config.get('APP_ENV') or app.config.get('APP_ENV', 'local') == 'local':
            email = None
            logger.info(f'Not sending email, local environment detected')
            return None
        else:
            logger.info(f'Trying to send email to : {email}')

        overriding_config = {}
        if send_email_as:
            overriding_config = {
                'SENDER': send_email_as,
            }

        return send_email(
            to=email,
            subject=subject,
            template=template,
            template_data=template_data,
            template_string=template_string,
            mailgun_config=app.config['MAILGUN'] | overriding_config,
        )

    def log_info_if_not_live(name, data):
        """
        This function is used to log information on the terminal,
        check for the APP_ENV and if it is not live, log the info.
        """

        if os.environ.get('APP_ENV') != 'live':
            logger.info(f'{name} : {data}')

    def import_data_based_on_column_index(each_row, data_key_and_index):
        data = {}
        # print('each_row :', each_row)
        for each_record_index, key in enumerate(each_row):
            # print('each_record_index :', each_record_index, 'key :', key)
            pass
        for each_key, index_and_type in data_key_and_index.items():
            # print(each_key, index_and_type)
            if type(index_and_type) == int:
                if len(each_row) < index_and_type or not each_row[index_and_type]:
                    continue
                elif each_row[index_and_type]:
                    data[each_key] = each_row[index_and_type]
            elif type(index_and_type) == tuple:
                if len(each_row) < index_and_type[0] or not each_row[index_and_type[0]]:
                    continue
                elif each_row[index_and_type[0]]:
                    if index_and_type[1] == int:
                        data[each_key] = int(str(each_row[index_and_type[0]]))
                    elif index_and_type[1] == bool:
                        if each_row[index_and_type[0]] in ['true', '1']:
                            data[each_key] = True
                        elif each_row[index_and_type[0]] in ['false', '0']:
                            data[each_key] = False
                        else:
                            data[each_key] = None

        return data

    # def integrate_never_bounce_for_email_validation(emails=None):
    #     client = neverbounce_sdk.client(api_key=app.config['NEVER_BOUNCE_API_KEY'])
    #     print('client :', client)

    #     info = client.account_info()
    #     print('credits info :', info)

    #     # resp1 = client.single_check('test@example.com')
    #     # print(resp1)
    #     # info = client.account_info()
    #     # print('credits info :', info)

    #     # resp2 = client.single_check('gokul@zephony.com')
    #     # print(resp2)
    #     # info = client.account_info()
    #     # print('credits info :', info)

    #     ################################################################

    #     # emails = [
    #     #     {'email': 'test@example.com'},   # must have an 'email' key
    #     #     {'email': 'kevin@zephony.com'},
    #     # ]
    #     # job = client.jobs_create(emails)
    #     # print('job :', job)

    #     # # all state-changing methods return a status object
    #     # resp = client.jobs_parse(job['job_id'], auto_start=False)
    #     # print('resp :', resp)

    #     # client.jobs_start(job['job_id'])
    #     # print('client :', client)

    #     # progress = client.jobs_status(job['job_id'])
    #     # print('progress :', progress)

    #     ################################################################

    #     all_my_jobs = client.jobs_search()
    #     type(all_my_jobs)       # neverbounce_sdk.bulk.ResultIter
    #     from pprint import pprint
    #     for each_job in all_my_jobs:
    #         print('each_job :', each_job)
    #         try:
    #             job_status = client.jobs_status(job_id=each_job['id'])
    #             # file_path = f'{app.root_path}/uploads/{each_job["id"]}.csv'
    #             # print('file_path :', file_path)
    #             # f = open(file_path, mode='wb')
    #             # resp = client.jobs_download(job_id=each_job['id'], fd=f)
    #             # f.close()
    #             resp = client.jobs_results(job_id=each_job['id'])
    #             # print('resp :', resp)
    #             for each_res in resp:
    #                 print('each_res :', each_res)
    #             pprint({
    #                 'each_job': each_job,
    #                 'status': job_status
    #             })
    #         except Exception as e:
    #             print('e :', e)

    #         # process job
    #         # this loop will make API calls behind the scenes, so be careful!
    #         # if all_my_jobs.page > 10:
    #         #     break

    #     info = client.account_info()
    #     print('credits info :', info)

    #     return None


class EmailActions():
    def get_formatted_email(content, sender_email, include_signature=True, include_unsubscribe_link=True):
        s = EmailActions.service.users().settings().sendAs().get(
            userId='me', sendAsEmail=sender_email
        ).execute()
        signature = s['signature']

        signature_with_prepended_line_breaks = f'<br /><br />{signature}'
        unsubscribe_link_with_prepended_line_breaks = f"""
            <br />
            <a href='https://zephony.in/unsubscribe'
                style="text-decoration: none; color: #bcb9b9;"
            >
                Unsubscribe
            </a>
        """

        body = f"""
            <html>
                <head></head>
                <body>
                    {content}

                    {signature_with_prepended_line_breaks if include_signature else ''}

                    {unsubscribe_link_with_prepended_line_breaks if include_unsubscribe_link else ''}
                </body>
            </html>
        """

        return body

    def get_message_details(message_id):
        # Retrieve the original message to get headers for threading
        original_message = service.users().messages().get(userId='me', id=message_id, format='metadata').execute()

        # Extract headers from the original message
        headers = original_message['payload']['headers']
        print(headers)
        subject_header = next((header for header in headers if header['name'] == 'subject'), None)
        in_reply_to_header = next((header for header in headers if header['name'] == 'Message-Id'), None)

        # print(subject_header['value'])
        # print(in_reply_to_header['value'])

        return in_reply_to_header['value'], subject_header['value']


    def send_mail(from_, to, subject, body, original_message_id=None, original_thread_id=None):
        # Create the email message
        # original_message_id = '<CADFbsn1cbBBk0k+mgbV1LsgrOiv0nEAiAvtdHqcYt1K-Y2v5Mg@mail.gmail.com>'
        # original_message_id = '<CADFbsn3CwsX_yjXLPRM4EmOPaOAD5hQQzDYVYJmPxZ5gc5Xc=Q@mail.gmail.com>'
        # original_thread_id = '18bb4adb817f7814'

        # message = MIMEText('I am sending this from the API so here you go with the details.')
        message = MIMEText(body, 'html')

        # TODO - Sending to dummy email IDs now
        # message['to'] = to
        message['to'] = 'Kevin Isaac <kevin@zephony.tech>'

        message['from'] = from_
        message['subject'] = subject

        # Only for a reply/followup
        if original_message_id and original_thread_id:
            message['In-Reply-To'] = original_message_id
            message['References'] = original_message_id
            message['threadId'] = original_thread_id

        raw = base64.urlsafe_b64encode(message.as_bytes())
        raw = raw.decode()

        body = {
            'raw': raw,
        }

        # Only for a reply/followup
        if original_message_id and original_thread_id:
            body['threadId'] = original_thread_id

        # Send the message
        try:
            m = EmailActions.service.users().messages().send(userId='me', body=body).execute()
            # print('Message Id: %s' % m['id'])
            return m['id'], m['threadId']
            # print('Thread Id: %s' % m['threadId'])
            # print(message)
        except Exception as error:
            print(f'An error occurred: {error}')


    def send_first_email(from_, to, subject, body):
        message_id, original_thread_id = EmailActions.send_mail(from_, to, subject, body)
        return message_id, original_thread_id


    def send_reply(from_, to, body, message_id, original_thread_id):
        original_message_id, original_subject = EmailActions.get_message_details(message_id)
        print(f'Original Message ID: {original_message_id}')
        print(f'Original Subject: {original_subject}')

        message_id, thread_id = EmailActions.send_mail(
            from_,
            to,
            f'Re: {original_subject}',
            body,
            original_message_id,
            original_thread_id,
        )
        return message_id


    def send_email_using_gmail_api(from_, to, subject, content):
        SCOPES = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
        ]

        sender_name = from_['name']
        sender_email = from_['email']
        receiver_string = f'{to["name"]} <{to["email"]}>'

        creds = None

        if from_['mail_account_object'].token_details:
            creds = Credentials(
                token=from_['mail_account_object'].token_details['token'],
                refresh_token=from_['mail_account_object'].token_details['refresh_token'],
                token_uri=from_['mail_account_object'].token_details['token_uri'],
                client_id=from_['mail_account_object'].token_details['client_id'],
                client_secret=from_['mail_account_object'].token_details['client_secret'],
                scopes=from_['mail_account_object'].token_details['scopes']
            )
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                # raise InvalidRequestData(
                #     message='Account not connected'
                # )

                domain = Domain.get_one(from_['mail_account_object'].id_)
                google_workspace_account = GoogleWorkspaceAccount.get_one(
                    domain.id_google_workspace_account
                )

                flow = InstalledAppFlow.from_client_config(
                    google_workspace_account.credentials,
                    SCOPES,
                    # TODO
                    # redirect_uri=f'http://{request.host}/gmail-auth-callback',
                    redirect_uri=f'http://localhost:8080/gmail-auth-callback',
                )
                # This will provide a URL to visit for authentication
                auth_url, _ = flow.authorization_url(prompt='consent')

                print('Please go to this URL: {}'.format(auth_url))
                # code = input('Enter the authorization code: ')
                code = '4/0AfJohXlcfFflj4tTSMUuF8o18MHm-fKjq9eqwH9DZMAN4qx5khsgfiDD62tJxTbhKYUY5A'
                flow.fetch_token(code=code)
                creds = flow.credentials
                print('Creds:', creds)

            # Update the database with new credentials
            from_['mail_account_object'].token_details = json.loads(
                creds.to_json()
            )

            # Since this will be executed in the rq queue
            db.session.commit()

        # Build the Gmail API service
        EmailActions.service = build('gmail', 'v1', credentials=creds)

        body = EmailActions.get_formatted_email(content, sender_email=sender_email)

        message_id, original_thread_id = EmailActions.send_first_email(
            from_=f'{sender_name} <{sender_email}>',
            to=receiver_string,
            subject=subject,
            body=body,
        )
        ic(message_id, original_thread_id)


class ExhibitShareLinkActions():
    def share_my_link(data):
        lead_name = data['user_details'].get('first_name')

        link_shared_to = CommonActions.send_email_to(
            email=data['emails'],
            subject=f'{lead_name} has invited you to try his demo',
            template='exhibit_share_email.py',
            template_data={
                'lead_name': lead_name,
                'exhibit_url': data['host_url'],
                'exhibit_url_display': data['host'],
            },
            # send_email_as='Admin <admin@mg.zephony.com>',
        )
        # print('link_shared_to :', link_shared_to)

        return None


class ExhibitLeadResponseActions():
    def lead_activities(username, data):
        logger.info('lead_activities', username, data)
        lead = Lead.filter_objects_by_keywords(
            {
                'username': username,
            },
            first_one=True
        )
        if not lead:
            raise ResourceNotFound(
                'Lead not found'
            )
        lead_data = {}
        lead_activity_data = {}

        if 'action_type' in data and data['action_type']:
            action_type = data.get('action_type')
            if action_type in json_data['exhibit_response_status']:
                if action_type  == 'not_interested':
                    lead_data['is_unsubscribed'] = True
                    lead_data['unsubscribed_manually'] = False
                    lead_data['unsubscription_date'] = datetime.now()


                lead_data['email_response_status'] = data.get('value')
                lead.update(lead_data)

            #Adding response as an activity to track multiple responses
            lead_activity_data['id_lead'] = lead.id_
            lead_activity_data['type_'] = data.get('action_type')
            lead_activity_data['exhibit_app_url'] = data.get('exhibit_app_url')
            lead_activity_data['activity_time'] = datetime.now()
            lead_activity = LeadActivity(lead_activity_data)

            InstantlyActions.add_email_to_instantly_blocklist(
                lead,
            )
            # Send Slack notification
            SlackActions.send_slack_notification(
                data['action_type'],
                lead,
            )

        return 'Successfully updated'


class SlackActions():
    def get_slack_message_payload(activity_token, lead):
        interested_message = {
            "text": f"🎉 {lead.first_name} {lead.last_name} is interested in the exhibit demo and he might have booked a sales call with Kevin.",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🎉 {lead.first_name} {lead.last_name} is interested. But don't worry. Kevin will probably screw up the sales call, so I'll let you know about the next one."
                    }
                },
                {
                    "type": "section",
                    "block_id": "section567",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"Check <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> out on Outreach.\n\nAnd update him on Instantly!",
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "https://res.cloudinary.com/teepublic/image/private/s--Vbbw3EO6--/t_Resized%20Artwork/c_fit,g_north_west,h_1054,w_1054/co_ffffff,e_outline:53/co_ffffff,e_outline:inner_fill:53/co_bbbbbb,e_outline:3:1000/c_mpad,g_center,h_1260,w_1260/b_rgb:eeeeee/c_limit,f_auto,h_630,q_auto:good:420,w_630/v1547152871/production/designs/3932294_0.jpg",
                        "alt_text": "Thumbs up image"
                    }
                },
            ]
        }

        not_interested_message = {
            "text": f"🙅 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> is not interested in our stuff.",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🙅 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> is not interested in our stuff.",
                    }
                },
            ]
        }

        later_message = {
            "text": f"🫡 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> says \"Next Quarter\". Take note people!",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🫡 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> says \"Next Quarter\". Take note people!",
                    }
                },
            ]
        }

        unsubscribed_message = {
            "text": f"✌🏻 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> unsubscribed.",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✌🏻 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> unsubscribed.",
                    }
                },
            ]
        }

        add_to_instantly_blocklist_message = {
            "text": f"✌🏻 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> is added to instantly blocklist.",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✌🏻 <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> is added to instantly blocklist.",
                    }
                },
            ]
        }

        error_adding_to_instantly_blocklist_message = {
            "text": f":alert:🏻 Error while adding <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> to instantly blocklist.",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":alert:🏻 Error while adding <{request.url_root}leads/{lead.id_}|{lead.first_name} {lead.last_name}> to instantly blocklist.",
                    }
                },
            ]
        }


        if activity_token == 'interested':
            return interested_message
        if activity_token == 'not_interested':
            return not_interested_message
        if activity_token == 'maybe_later':
            return later_message
        if activity_token == 'unsubscribe':
            return unsubscribed_message
        if activity_token == 'add_to_instantly_blocklist':
            return add_to_instantly_blocklist_message
        if activity_token == 'error_adding_to_instantly_blocklist':
            return error_adding_to_instantly_blocklist_message

    def send_slack_notification(activity_token, lead):
        slack_message_payload = SlackActions.get_slack_message_payload(activity_token, lead)

        if not app.config.get('APP_ENV') or app.config.get('APP_ENV', 'local') == 'local':
            print('Local environment detected—not sending Slack notification')

        if slack_message_payload and app.config.get('SLACK_WEBHOOK_URL'):
            requests.post(
                app.config.get('SLACK_WEBHOOK_URL'),
                json=slack_message_payload,
            )


class InstantlyCampaignActions():
    def get_all(params={}):
        instantly_campaigns_details = InstantlyCampaign.filter(
            # filters={
            #     'id_': 3,
            # },
            pagination={
                'page': params.get('page'),
                'page_size': params.get('page_size'),
            },
            reverse_order=False,
            joins=[
                # (User, InstantlyCampaign.id_creator_user, User.id_)
                (Industry, 'id_industry', 'industry_details'),
            ],
            first_item=False,
        )

        return instantly_campaigns_details

    def _get_details(id_):
        instantly_campaign_details = InstantlyCampaign.filter(
            filters={
                'id_': id_,
            },
            first_item=True,
        )

        return instantly_campaign_details

    def get(id_):
        instantly_campaign_details = InstantlyCampaignActions._get_details(id_)
        if not instantly_campaign_details:
            raise ResourceNotFound

        return instantly_campaign_details

    def update(id_, data):
        instantly_campaign = InstantlyCampaign.get_one(id_, with_organization=False)
        if instantly_campaign is None:
            raise ResourceNotFound

        errors = []
        if data.get('id_industry'):
            # Check if industry is present
            industry = Industry.query.filter(Industry.id_ == data['id_industry']).first()
            if not industry:
                errors.append({
                    'field': 'data.id_industry',
                    'description': 'Industry does not exist',
                })

        if errors:
            raise InvalidRequestData(errors)

        instantly_campaign.update(data)

        return instantly_campaign.get_details()

    # TODO
    def delete(id_):
        instantly_campaign = InstantlyCampaign.get_one(id_, with_organization=False)
        if instantly_campaign is None:
            raise ResourceNotFound

        instantly_campaign.soft_delete()

        return {}


class InstantlyActions():
    def add_email_to_instantly_blocklist(lead):
        instantly_slack_notification_activity_token = ''
        url = f"{app.config.get('INSTANTLY_API_URL')}blocklist/add/entries"
        payload = {
            'api_key': app.config.get('INSTANTLY_API_KEY'),
            'entries': [
                lead.email,
            ]
        }

        try:
            response = requests.post(url, json=payload)
            ic(response)

            if response.ok:
                instantly_slack_notification_activity_token = 'add_to_instantly_blocklist'
            else:
                instantly_slack_notification_activity_token = 'error_adding_to_instantly_blocklist'
        except requests.RequestException as e:
            ic(e)
            instantly_slack_notification_activity_token = 'error_adding_to_instantly_blocklist'

        SlackActions.send_slack_notification(
            instantly_slack_notification_activity_token,
            lead,
        )

    def sync_campaigns_from_instantly():
        url = f"{app.config.get('INSTANTLY_API_URL')}campaign/list"
        params = {
            'api_key': app.config.get('INSTANTLY_API_KEY'),
            'limit': 100,
        }

        try:
            r = requests.get(url, params=params)
            i_campaigns = r.json()

            # accepts_leads now has to be manually set
            accepting_campaigns = InstantlyCampaign.query.filter(
                InstantlyCampaign.accepts_leads.is_(True)
            ).all()
            for accepting_campaign in accepting_campaigns:
                pass
                # accepting_campaign.accepts_leads = False

            for i_campaign in i_campaigns:
                campaign = InstantlyCampaign.query.filter(
                    InstantlyCampaign.instantly_id==i_campaign['id']
                ).first()

                if campaign:
                    campaign.name = i_campaign['name']
                    campaign.last_synced_on = datetime.now()
                    # campaign.accepts_leads = True
                else:
                    # Create a new entry
                    campaign = InstantlyCampaign({
                        'name': i_campaign['name'],
                        'instantly_id': i_campaign['id'],
                        'last_synced_on': datetime.now(),
                        'accepts_leads': False,
                    })
                    db.session.add(campaign)

            if r.ok:
                return r.json()
            else:
                raise Exception('Some error happened from Instantly')
        except requests.RequestException as e:
            raise e
            raise Exception('Some error happened from Instantly')

    def sync_campaign_summary_from_instantly(data):
        instantly_campaign = InstantlyCampaign.get_one(
            data['id_instantly_campaign'],
            with_organization=False,
        )

        if not instantly_campaign:
            raise ResourceNotFound()

        url = f"{app.config.get('INSTANTLY_API_URL')}analytics/campaign/summary"
        params = {
            'api_key': app.config.get('INSTANTLY_API_KEY'),
            'campaign_id': instantly_campaign.instantly_id,
        }

        try:
            r = requests.get(url, params=params)
            summary = r.json()

            if r.ok:
                instantly_campaign.summary = summary
                return r.json()
            else:
                raise Exception('Some error happened from Instantly')
        except requests.RequestException as e:
            raise e
            raise Exception('Some error happened from Instantly')

    def push_leads_to_instantly_campaigns():
        verification_steps = Step.filter(
            filters={
                'token': 'pending_manual_verification'
            },
            first_item=True,
            get_details=False,
        )
        verification_step = verification_steps[0]
        pushing_to_instantly_steps = Step.filter(
            filters={
                'token': 'pushing_to_instantly'
            },
            first_item=True,
            get_details=False,
        )
        pushing_to_instantly_step = pushing_to_instantly_steps[0]
        pushed_to_instantly_steps = Step.filter(
            filters={
                'token': 'pushed_to_instantly'
            },
            first_item=True,
            get_details=False,
        )
        pushed_to_instantly_step = pushed_to_instantly_steps[0]

        # Get the leads
        query = db.session.query(Lead, LeadBridgeStep, Company, Industry)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == pushing_to_instantly_step.id_,
                )
            )\
            .join(
                Company,
                Lead.id_company == Company.id_,
            )\
            .join(
                Industry,
                Lead.id_industry == Industry.id_,
            )\
            .filter(
                or_(
                    LeadBridgeStep.external_job_started_on.is_(None),
                    LeadBridgeStep.external_job_requires_retry.is_(True),
                )
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )

        if app.config.get('APP_ENV') != 'live':
            ic('Non-live environment detected, so only 2 leads are being pushed to instantlly')
            query = query.limit(2)

        results = query.all()

        industries_map = {}
        for lead, lead_bridge_step, *_ in results:
            # # Update the step in the lead table
            # lead.id_step = pushing_to_instantly_step.id_
            #
            # # Update the bridge table entry
            # lead_bridge_step.exited_on = datetime.now()
            #
            # # Create the next bridge row
            # # Only add bridge row if not already present
            # existing_next_lead_bridge_step = LeadBridgeStep.filter(
            #     filters={
            #         'id_lead': lead.id_,
            #         'id_step': pushing_to_instantly_step.id_,
            #     },
            # )
            # if not existing_next_lead_bridge_step:
            #     next_lead_bridge_step = LeadBridgeStep({
            #         'id_lead': lead.id_,
            #         'id_step': pushing_to_instantly_step.id_,
            #         'entered_on': datetime.now(),
            #     })
            #     db.session.add(next_lead_bridge_step)

            if not lead.id_industry in industries_map:
                industries_map[lead.id_industry] = []

                # Fetch the campaigns with that industry
                i_campaigns = InstantlyCampaign.filter(
                    {'id_industry': lead.id_industry},
                    get_details=False,
                )

                # Fetch summaries for each campaign
                for i_campaign in i_campaigns:
                    if not i_campaign.accepts_leads:
                        continue
                        # raise InvalidRequestData({
                        #     'field': 'campaigns',
                        #     'description': 'Cannot find one or more campaigns that accepts leads for one or more industries',
                        # })
                    InstantlyActions.sync_campaign_summary_from_instantly({
                        'id_instantly_campaign': i_campaign.id_,
                    })

                    # Populate the map
                    i_campaign_details = i_campaign.get_details()
                    i_campaign_details['leads_for_instantly'] = []
                    industries_map[lead.id_industry].append(i_campaign_details)

        for lead, lead_bridge_step, company, industry in results:
            lead_details = {
                # 'lead_object': lead,
                # 'lead_bridge_step_object': lead_bridge_step,
                'id': lead.id_,
                'email': lead.email,
                'first_name': lead.first_name,
                'last_name': lead.last_name,
                'name': lead.name,
                'company_name': company.name,
                'custom_variables': {
                    'username': lead.username,
                    'companyShortName': company.short_name or company.name,
                    'companyUltraShortName': company.ultra_short_name or company.name,
                    'industryLowercase': industry.lowercase_for_template or industry.name,
                    'unsubscribeToken': lead.unsubscribe_token,
                },
            }
            lucky_campaign = industries_map[lead.id_industry][
                random.randint(0, len(industries_map[lead.id_industry]) - 1)
            ]
            lucky_campaign['leads_for_instantly'].append(lead_details)

        # return industries_map
        for id_industry, i_campaigns_details in industries_map.items():
            for i_campaign_details in i_campaigns_details:
                if len(i_campaign_details['leads_for_instantly']) == 0:
                    ic('Skipping as no lead is found:', i_campaign_details)
                    continue

                # Create the attempt table entry
                instantly_push_attempt = InstantlyPushAttempt({})
                db.session.add(instantly_push_attempt)

                # Push leads to campaign
                url = f"{app.config.get('INSTANTLY_API_URL')}lead/add"
                payload = {
                    'api_key': app.config.get('INSTANTLY_API_KEY'),
                    'campaign_id': i_campaign_details['instantly_id'],
                    'skip_if_in_workspace': True,
                    'leads': i_campaign_details['leads_for_instantly'],
                }


                results = db.session.query(Lead, LeadBridgeStep)\
                    .join(
                        LeadBridgeStep,
                        and_(
                            Lead.id_ == LeadBridgeStep.id_lead,
                            LeadBridgeStep.id_step == pushing_to_instantly_step.id_,
                        )
                    )\
                    .filter(
                        Lead.id_.in_(
                            [l['id'] for l in i_campaign_details['leads_for_instantly']]
                        )
                    ).all()

                try:
                    instantly_api_error = None
                    external_job_started_time = datetime.now()
                    r = requests.post(url, json=payload)
                    data = r.json()
                    ic(data)
                    if data['status'] == 'success':
                        instantly_push_attempt.external_status = 'success'
                        instantly_push_attempt.external_status_on = datetime.now()

                        # TODO: How to get these?
                        for lead, lead_bridge_step in results:
                            # Update the lead's step
                            lead.id_step = pushed_to_instantly_step.id_

                            # Update the existing lead bridge step
                            lead_bridge_step.external_job_started_on = external_job_started_time
                            lead_bridge_step.external_job_completed_on = datetime.now()
                            lead_bridge_step.exited_on = datetime.now()

                            # Create the new lead bridge step
                            existing_pushed_lead_bridge_step = LeadBridgeStep.filter(
                                filters={
                                    'id_lead': lead.id_,
                                    'id_step': pushed_to_instantly_step.id_,
                                },
                            )
                            if not existing_pushed_lead_bridge_step:
                                pushed_lead_bridge_step = LeadBridgeStep({
                                    'id_lead': lead.id_,
                                    'id_step': pushed_to_instantly_step.id_,
                                    'entered_on': datetime.now(),
                                })
                                db.session.add(pushed_lead_bridge_step)
                        continue
                    else:
                        instantly_api_error = Exception('Some error happened with Instantly')
                except Exception as e:
                    instantly_api_error = e

                ic(instantly_api_error)
                instantly_push_attempt.external_status = 'error'
                instantly_push_attempt.external_status_on = datetime.now()

                for lead, lead_bridge_step in results:
                    # Update the existing lead bridge step
                    lead_bridge_step.external_job_requires_retry = True
                return 'Some error happened on Instantly'
        return None


class ScrubbyActions():
    def get_apis():
        return  {
            'submit': {
                'endpoint': f'{app.config.get("SCRUBBY_API_URL")}bulk_add_email',
                'payload': {
                    'emails': [],
                    'callback_url': 'https://outreach.zephony.com/scrubby_callback_dummy',
                    'identifier': 'dummy',
                },
                'headers': {
                  'Content-Type': 'application/json',
                  'x-api-key': app.config.get('SCRUBBY_API_KEY')
                }
            },
            'fetch': {
                'endpoint': f'{app.config.get("SCRUBBY_API_URL")}bulk_fetch_email',
                'payload': {
                    'emails': [],
                },
                'headers': {
                  'Content-Type': 'application/json',
                  'x-api-key': app.config.get('SCRUBBY_API_KEY')
                }
            },
        }

    def submit_emails_to_scrubby():
        # Fetch all leads in step 'verifying_emails_using_scrubby'
        # that haven't started
        current_steps = Step.filter(
            filters={
                'token': 'verifying_emails_using_scrubby'
            },
            first_item=True,
            get_details=False,
        )
        current_step = current_steps[0]

        next_steps = Step.filter(
            filters={
                'token': 'pending_enrichment'
            },
            first_item=True,
            get_details=False,
        )
        next_step = next_steps[0]

        query = db.session.query(Lead, LeadBridgeStep)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == current_step.id_,
                )
            )\
            .filter(
                or_(
                    LeadBridgeStep.external_job_started_on.is_(None),
                    LeadBridgeStep.external_job_requires_retry.is_(True),
                )
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )

        if app.config.get('APP_ENV') != 'live':
            ic('Non-live environment detected, so only emails of 2 leads are being verified')
            query = query.limit(2)
        else:
            query = query.limit(100)

        results = query.all()

        emails = []
        for lead, lead_bridge_step in results:
            emails.append(lead.email)

        ic(len(emails))
        ic(emails, '+++++++++++++++++')
        api = ScrubbyActions.get_apis()['submit']
        payload = copy.deepcopy(api['payload'])
        headers = copy.deepcopy(api['headers'])

        payload['emails'] = emails

        ic('Scrubby request:', payload['emails'])

        r = requests.post(
            api['endpoint'],
            headers=headers,
            json=payload,
        )
        for lead, lead_bridge_step in results:
            lead_bridge_step.external_job_started_on = datetime.now()

        # Create entry in scrubby_validation_attempts table
        scrubby_validation_attempt = ScrubbyValidationAttempt({
            'request_payload': payload,
            'status': 'success',        # Since we won't use this table after this
            'submitted_on': datetime.now(),
        })
        db.session.add(scrubby_validation_attempt)

        if r.status_code == 200:
            data = r.json()
            ic('Scrubby response:', data)
            scrubby_validation_attempt.job_response_payload = data

            print(data)
            for lead, lead_bridge_step in results:
                lead_bridge_step.external_job_requires_retry = False

            scrubby_validation_attempt.external_status = 'pending'
            scrubby_validation_attempt.external_status_on = datetime.now()
            return data

        elif 400 <= r.status_code < 500:
            scrubby_validation_attempt.external_status = 'error'
            scrubby_validation_attempt.external_status_on = datetime.now()
            print(f"Client error occurred: {r.status_code} {r.reason}")

            for lead, lead_bridge_step in results:
                lead_bridge_step.external_job_requires_retry = True
        else:
            scrubby_validation_attempt.external_status = 'error'
            scrubby_validation_attempt.external_status_on = datetime.now()
            print(f"Server error occurred: {r.status_code} {r.reason}")

            for lead, lead_bridge_step in results:
                lead_bridge_step.external_job_requires_retry = True
        return r.reason

    def fetch_email_statuses_from_scrubby():
        current_step = Step.filter(
            filters={
                'token': 'verifying_emails_using_scrubby'
            },
            first_item=True,
            get_details=False,
        )[0]

        next_step = Step.filter(
            filters={
                'token': 'pending_enrichment'
            },
            first_item=True,
            get_details=False,
        )[0]

        query = db.session.query(Lead, LeadBridgeStep)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == current_step.id_,
                )
            )\
            .filter(
                or_(
                    and_(
                        LeadBridgeStep.external_job_started_on.isnot(None),
                        LeadBridgeStep.external_job_completed_on.is_(None),
                        LeadBridgeStep.exited_on.is_(None),
                    ),
                    and_(
                        LeadBridgeStep.external_job_started_on.isnot(None),
                        LeadBridgeStep.external_job_completed_on.isnot(None),
                        LeadBridgeStep.exited_on.is_(None),
                        LeadBridgeStep.external_job_requires_retry.is_(True),
                    ),
                ),
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )

        if app.config.get('APP_ENV') != 'live':
            ic('Non-live environment detected, so only emails of 2 leads are being verified')
            query = query.limit(2)
        else:
            query = query.limit(100)

        results = query.all()

        # Check status first and update the attempt row
        api = ScrubbyActions.get_apis()['fetch']
        payload = copy.deepcopy(api['payload'])
        headers = copy.deepcopy(api['headers'])

        leads_email_map = {}
        for lead, lead_bridge in results:
            payload['emails'].append(lead.email)
            leads_email_map[lead.email] = {
                'lead': lead,
                'lead_bridge_step': lead_bridge,
            }

        # payload['emails'] = payload['emails'][1:]
        # return payload

        r = requests.post(
            api['endpoint'],
            json=payload,
            headers=headers,
        )
        if r.status_code == 200:
            data = r.json()
            ic('SCRUBBY VALIDATION RESPONSE:', data)
            for email_response in data:
                if email_response['status'] == 'pending':
                    continue
                elif email_response['status'].lower() == 'valid':
                    # Set the email status as valid
                    lead = leads_email_map[email_response['email']]['lead']
                    current_lead_bridge_step = leads_email_map[email_response['email']][
                        'lead_bridge_step'
                    ]
                    lead.email_status = 'valid'
                    lead.id_step = next_step.id_

                    # Exit from current step on the bridge row
                    current_lead_bridge_step.external_job_completed_on = datetime.now()
                    current_lead_bridge_step.exited_on = datetime.now()
                    current_lead_bridge_step.external_job_status = 'success'

                    # Only add bridge row if not already present
                    existing_next_lead_bridge_step = LeadBridgeStep.filter(
                        filters={
                            'id_lead': lead.id_,
                            'id_step': next_step.id_,
                        },
                    )
                    if not existing_next_lead_bridge_step:
                        next_lead_bridge_step = LeadBridgeStep({
                            'id_lead': lead.id_,
                            'id_step': next_step.id_,
                            'entered_on': datetime.now(),
                        })
                        db.session.add(next_lead_bridge_step)
                elif email_response['status'].lower() == 'invalid':
                    lead.has_failed_on_step = True
                    lead.failed_reason = 'Email found to be invalid by Scrubby '

                    # Update the bridge row
                    current_lead_bridge_step = leads_email_map[email_response['email']][
                        'lead_bridge_step'
                    ]
                    current_lead_bridge_step.external_job_completed_on = datetime.now()
                    current_lead_bridge_step.exited_on = datetime.now()
                    current_lead_bridge_step.external_job_status = email_response['status']
                else:
                    # Not sure what all statuses can come here.
                    ic('UNKNOWN STATUS -------------------------------')
                    ic(email_response)
            # db.session.rollback()
            return data

        elif 400 <= r.status_code < 500:
            print(f"Client error occurred: {r.status_code} {r.reason}")
        else:
            print(f"Server error occurred: {r.status_code} {r.reason}")

        return 'failed'


class FlowActions():
    cookies = {
        '_leadgenie_session': quote('TmO4RPoFXAuTjyP8C6ohxh8j/jujQPSVtkoaKSSH5uqxagYXUbnJ4cWrOIpkBzj928Zl8w6MJhqgA8UmY4+Sf0F1XjTThUAasDJb+2lOgCLtQLaTzR5mZxKhmj/dPLgMc8UvLN/F4A5yVooJI0YYmvCa7JGreiYBpNtsYpz86qxrs2zJAtP6rweeS7jSWUBT+xx4u1AR7Z4WW/aYPEGhBd9hxIw691t8UGpruEDVN37uxPMC3zbjYm7tUKHrHKnTHOf/mewXZG23h6MqSuNHjSubZYki2L2KnC0=--WBhlHy+bCGltWiUd--VoZN5K+rxtf1OKEwiMiVNA=='),
        'remember_token_leadgenie_v2': quote('eyJfcmFpbHMiOnsibWVzc2FnZSI6IklqWTFaVFppTW1VM01EVTRNVFUyTURaaU5XVm1aakk0Tmw4ek5ETTNNVEE1TVdSak5UWTBOMll3TkdZeFpHWm1aR0prWVRZM05USXdPU0k9IiwiZXhwIjoiMjAyNC0wNC0wNVQwOTozNTo1OS42MzRaIiwicHVyIjoiY29va2llLnJlbWVtYmVyX3Rva2VuX2xlYWRnZW5pZV92MiJ9fQ==--96052c268576d12775fd41071ebd38e8a3f6866c'),
    }

    headers = {
        'X-CSRF-TOKEN': 'FN_lzP3wr64AvC4ptopPRCokyLUDcnQ_QLl9SU9H0sMW9CR8JLe86Z0XIZw_2oT7IAwUyzOnUbqokUGuZQGTsg',
    }

    apis = {
        'search': {
            'endpoint': 'https://app.apollo.io/api/v1/mixed_people/search',
            'payload': {
                # To be fetched from the browser URL
                'finder_view_id': None,
                'organization_industry_tag_ids': [],
                'person_locations': [],
                'person_titles': [],

                # Hardcoded
                'prospected_by_current_team': [
                    'no'
                ],
                'display_mode': 'explorer_mode',
                'per_page': 25,
                'open_factor_names': [],
                'num_fetch_result': 1,
                'context': 'people-index-page',
                'show_suggestions': False,

                'page': None,
            },
        },
        'get_emails': {
            'endpoint': 'https://app.apollo.io/api/v1/mixed_people/add_to_my_prospects',
            'payload': {
                # To be fetched from the search endpoint
                'entity_ids': [],

                # Hardcoded
                'skip_fetching_people': True,
            },
        },
    }


    def _fetch_leads_from_apollo(search_url, page):
        url = FlowActions.apis['search']['endpoint']
        payload = copy.deepcopy(FlowActions.apis['search']['payload'])

        # Parse the URL to extract the query string
        parsed_url = urlparse(search_url)
        query_string = parsed_url.fragment.split('?')[1]  # Extract the query part after '#'

        # Parse the query string to get the parameters
        params = parse_qs(query_string)
        # print(params)

        # Extract 'personLocations' parameter
        payload['person_locations'] = params.get('personLocations[]', [])
        payload['person_titles'] = params.get('personTitles[]', [])
        payload['organization_industry_tag_ids'] = params.get('organizationIndustryTagIds[]', [])
        payload['organization_num_employees_ranges'] = params.get('organizationNumEmployeesRanges[]', [])
        payload['organization_trading_status'] = params.get('organizationTradingStatus[]', [])
        payload['finder_view_id'] = params.get('finderViewId', [None])[0]

        payload['page'] = page
        if params.get('personTotalYoeRange[max]'):
            payload['person_total_yoe_range'] = {
                'max': params.get('personTotalYoeRange[max]', [None])[0],
                'min': params.get('personTotalYoeRange[min]', [None])[0],
            }

        # ic(payload)

        r = requests.post(
            url,
            json=payload,
            cookies=FlowActions.cookies,
            headers=FlowActions.headers
        )
        # ic(r.json())
        if r.status_code == 200:
            data = r.json()
            print(f'Returning {len(data["people"])} people (page {page})..')

            return data['people']

        elif 400 <= r.status_code < 500:
            print(f"Client error occurred: {r.status_code} {r.reason}")
        else:
            print(f"Server error occurred: {r.status_code} {r.reason}")

        return None, r

    def store_leads_from_apollo(data):
        pages = list(
            range(
                int(data['start_page']),
                int(data['end_page']) + 1,
            )
        )

        all_people = []
        total_people = []
        unique_people = set()
        leads_added = 0
        for page in pages:
            total_people_in_page = []
            unique_people_in_page = set()

            external_job_started_on = datetime.now()
            people = FlowActions._fetch_leads_from_apollo(data['search_url'], page)
            external_job_completed_on = datetime.now()

            apollo_lead_fetch_attempt_data = {
                'id_industry': data['id_industry'],
                'page_number': page,
                'search_url': data['search_url'],
            }
            apollo_lead_fetch_attempt = ApolloLeadFetchAttempt(apollo_lead_fetch_attempt_data)
            db.session.add(apollo_lead_fetch_attempt)

            # Tuple is returned if there was an Apollo API error
            if isinstance(people, tuple):
                res = people[1]
                apollo_lead_fetch_attempt.external_status = 'error'
                apollo_lead_fetch_attempt.external_status_on = datetime.now()
                try:
                    apollo_lead_fetch_attempt.external_error_response = res.json()
                except ValueError:
                    apollo_lead_fetch_attempt.external_error_response = {
                        'text_response_from_apollo': res.text,
                    }

                external_job_status = 'unknown_error'

                raise ServerError([{
                    'field': None,
                    'description': 'Error while querying the Apollo API',
                }])
            else:
                apollo_lead_fetch_attempt.external_status = 'success'
                apollo_lead_fetch_attempt.external_status_on = datetime.now()

                external_job_status = 'success'


            for person in people:
                total_people_in_page.append(person['id'])
                unique_people_in_page.add(person['id'])
                total_people.append(person['id'])
                unique_people.add(person['id'])

                # Check if lead already exists with the same Apollo ID
                existing_lead = Lead.query.filter(
                    Lead.apollo_person_id==person['id']
                ).first()
                if existing_lead:
                    continue

                lead_data = {
                    'name': person['name'],
                    'first_name': person['first_name'],
                    'last_name': person['last_name'],
                    'linkedin_url': person['linkedin_url'],
                    'apollo_person_id': person['id'],
                    'id_industry': data['id_industry'],
                }

                username = tokenify(lead_data['first_name'], '')
                if Lead.query.filter(Lead.username==username).first():
                    username = tokenify(lead_data['name'], '')

                    if Lead.query.filter(Lead.username==username).first():
                        username = None
                if username:
                    lead_data['username'] = username

                # Get company if exists. If not, create it

                # Sometimes for whatever reason, the 'organization' key
                # doesn't seem to be present in person
                try:
                    company = Company.filter(
                        filters={
                            'apollo_organization_id': person['organization']['id'],
                        },
                        first_item=True,
                        get_details=False,
                    )
                except KeyError as e:
                    print(e)
                    continue
                if not company and person['organization']['name']:
                    company = Company.filter(
                        filters={
                            'name': person['organization']['name'],
                        },
                        first_item=True,
                        get_details=False,
                    )
                if not company and person['organization']['website_url']:
                    company = Company.filter(
                        filters={
                            'website_url': person['organization']['website_url'],
                        },
                        first_item=True,
                        get_details=False,
                    )
                if not company and person['organization']['primary_domain']:
                    company = Company.filter(
                        filters={
                            'primary_domain': person['organization']['primary_domain'],
                        },
                        first_item=True,
                        get_details=False,
                    )
                if company:
                    company = company[0]
                else:
                    # Create the company here
                    company = Company({
                        'name': person['organization']['name'],
                        'apollo_organization_id': person['organization']['id'],
                        'website_url': person['organization']['website_url'],
                        'primary_domain': person['organization']['primary_domain'],
                        'logo_path': person['organization']['logo_url'],
                    })
                    db.session.add(company)
                    db.session.flush()
                lead_data['id_company'] = company.id_


                # Get designation if exists. If not, create it
                designation = None
                if person['title']:
                    designation = Designation.filter(
                        filters={
                            'name': person['title'],
                        },
                        first_item=True,
                        get_details=False,
                    )
                if designation:
                    designation = designation[0]
                else:
                    designation = Designation({
                        'name': person['title'],
                    })
                    db.session.add(designation)
                    db.session.flush()
                lead_data['id_designation'] = designation.id_

                # Get the current step (hardcoded)
                step = Step.filter(
                    filters={
                        'token': 'fetching_emails_from_apollo'
                    },
                    first_item=True,
                    get_details=False,
                )
                lead_data['id_step'] = step[0].id_

                leads_added += 1
                lead = Lead(lead_data)
                db.session.add(lead)
                db.session.flush()

                # Only add bridge row if not already present
                existing_lead_bridge_step = LeadBridgeStep.filter(
                    filters={
                        'id_lead': lead.id_,
                        'id_step': step[0].id_,
                    },
                )
                if not existing_lead_bridge_step:
                    lead_bridge_step = LeadBridgeStep({
                        'id_lead': lead.id_,
                        'id_step': step[0].id_,
                        'entered_on': datetime.now(),
                        # 'external_job_started_on': external_job_started_on,
                        # 'external_job_completed_on': external_job_completed_on,
                        # 'external_job_status': external_job_status,
                    })
                    db.session.add(lead_bridge_step)

            print(len(total_people_in_page), len(unique_people_in_page))
            all_people += people

        return {
            'count': len(all_people),
            'leads_added': leads_added,
            'total_people': len(total_people),
            'unique_people': len(unique_people),
            'people': [person['name'] for person in all_people],
        }
        return all_people

    def push_lead_to_step():
        pass

    def auto_store_emails_from_apollo():
        pass
        # Fetch leads in `fetching_emails_from_apollo` step

    def move_lead_to_verification_step(data):
        enrichment_step = Step.filter(
            {
                'token': 'pending_enrichment',
            },
            first_item=True,
            get_details=False,
        )[0]
        verification_step = Step.filter(
            {
                'token': 'pending_manual_verification',
            },
            first_item=True,
            get_details=False,
        )[0]

        result = db.session.query(Lead, LeadBridgeStep)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == enrichment_step.id_,
                )
            )\
            .filter(
                LeadBridgeStep.exited_on.is_(None)
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )\
            .filter(
                Lead.id_ == data['id_lead']
            ).first()

        if not result:
            raise ResourceNotFound()

        lead, enrichment_bridge = result

        lead.id_step = verification_step.id_
        enrichment_bridge.exited_on = datetime.now()

        # Create the new lead bridge step
        existing_verification_lead_bridge_step = LeadBridgeStep.filter(
            filters={
                'id_lead': lead.id_,
                'id_step': verification_step.id_,
            },
        )
        if not existing_verification_lead_bridge_step:
            verification_lead_bridge_step = LeadBridgeStep({
                'id_lead': lead.id_,
                'id_step': verification_step.id_,
                'entered_on': datetime.now(),
            })
            db.session.add(verification_lead_bridge_step)

    def move_lead_to_instantly_step(data):
        verification_step = Step.filter(
            {
                'token': 'pending_manual_verification',
            },
            first_item=True,
            get_details=False,
        )[0]
        instantly_step = Step.filter(
            {
                'token': 'pushing_to_instantly',
            },
            first_item=True,
            get_details=False,
        )[0]

        result = db.session.query(Lead, LeadBridgeStep)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == verification_step.id_,
                )
            )\
            .filter(
                LeadBridgeStep.exited_on.is_(None)
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )\
            .filter(
                Lead.id_ == data['id_lead']
            ).first()

        if not result:
            raise ResourceNotFound()

        lead, verification_bridge = result

        lead.id_step = instantly_step.id_
        verification_bridge.exited_on = datetime.now()

        # Create the new lead bridge step
        existing_instantly_lead_bridge_step = LeadBridgeStep.filter(
            filters={
                'id_lead': lead.id_,
                'id_step': instantly_step.id_,
            },
        )
        if not existing_instantly_lead_bridge_step:
            instantly_lead_bridge_step = LeadBridgeStep({
                'id_lead': lead.id_,
                'id_step': instantly_step.id_,
                'entered_on': datetime.now(),
            })
            db.session.add(instantly_lead_bridge_step)

    def _fetch_emails_from_apollo(apollo_people_ids):
        url = FlowActions.apis['get_emails']['endpoint']
        payload = copy.deepcopy(FlowActions.apis['get_emails']['payload'])
        payload['entity_ids'] = apollo_people_ids

        r = requests.post(
            url,
            json=payload,
            cookies=FlowActions.cookies,
            headers=FlowActions.headers,
        )
        if r.status_code == 200:
            data = r.json()
            return data['contacts']
        elif 400 <= r.status_code < 500:
            print(f"Client error occurred: {r.status_code} {r.reason}")
        else:
            print(f"Server error occurred: {r.status_code} {r.reason}")

        return None, r

    # Called internally by auto_store_emails_from_apollo
    def store_emails_from_apollo(ids_lead=None):
        # Fetch all leads in step 'fetching_emails_from_apollo'
        # that haven't started
        steps = Step.filter(
            filters={
                'token': 'fetching_emails_from_apollo'
            },
            first_item=True,
            get_details=False,
        )
        step = steps[0]

        results = db.session.query(Lead, LeadBridgeStep)\
            .join(LeadBridgeStep, Lead.id_ == LeadBridgeStep.id_lead)\
            .filter(LeadBridgeStep.id_step == step.id_)\
            .filter(
                or_(
                    LeadBridgeStep.external_job_started_on.is_(None),
                    LeadBridgeStep.external_job_requires_retry.is_(True),
                )
            ).all()

        apollo_person_ids = []
        apollo_person_ids_map = {}
        for lead, lead_bridge_step in results:
            # Don't ask apollo if email already exists.
            # This shouldn't happen on live as leads with emails will
            # already be promoted to the next step.
            if lead.email:
                continue

            print(lead, lead_bridge_step)
            apollo_person_ids.append(lead.apollo_person_id)
            apollo_person_ids_map[lead.apollo_person_id] = {
                'lead': lead,
                'lead_bridge_step': lead_bridge_step,
            }


        lists_of_size_25 = [
            apollo_person_ids[i:i + 25] for i in range(0, len(apollo_person_ids), 25)
        ]

        if app.config.get('APP_ENV') != 'live':
            ic('Non-live environment detected, so only emails of 2 leads are being fetched')
            lists_of_size_25 = [apollo_person_ids[:2]]

        for list_of_size_25 in lists_of_size_25:
            external_job_started_on = datetime.now()
            contacts = FlowActions._fetch_emails_from_apollo(list_of_size_25)
            external_job_completed_on = datetime.now()

            apollo_email_fetch_attempt_data = {}
            apollo_email_fetch_attempt = ApolloEmailFetchAttempt(apollo_email_fetch_attempt_data)
            db.session.add(apollo_email_fetch_attempt)
            apollo_email_fetch_attempt.external_status_on = datetime.now()

            # Tuple is returned if there was an Apollo API error
            if isinstance(contacts, tuple):
                res = contacts[1]
                apollo_email_fetch_attempt.external_status = 'error'
                external_job_status = 'error'
                try:
                    apollo_email_fetch_attempt.external_error_response = res.json()
                except ValueError:
                    apollo_email_fetch_attempt.external_status = {
                        'text_response_from_apollo': res.text,
                    }

                # Update the status on the bridge table
                for lead, lead_bridge_step in results:
                    lead_bridge_step.external_job_status = 'error'
                    lead_bridge_step.external_job_requires_retry = True

                try:
                    ic(res.json())
                    error_message = res.json()['error']
                except Exception:       # TODO: Use the right exception here
                    error_message = res.text

                raise ServerError([{
                    'field': None,
                    'description': 'Apollo error: ' + error_message,
                }])
            else:
                external_job_status = 'success'


            apollo_email_fetch_attempt.external_status = 'success'

            # Fetch the next step to assign it to the lead
            neverbounce_steps = Step.filter(
                filters={
                    'token': 'verifying_emails_using_neverbounce'
                },
                first_item=True,
                get_details=False,
            )
            neverbounce_step = neverbounce_steps[0]

            for contact in contacts:
                lead = apollo_person_ids_map[contact['person_id']]['lead']
                lead_bridge_step = apollo_person_ids_map[contact['person_id']]['lead_bridge_step']

                lead_bridge_step.external_job_started_on = external_job_started_on
                lead_bridge_step.external_job_completed_on = external_job_completed_on
                lead_bridge_step.external_job_status = external_job_status

                existing_lead_with_email = Lead.query.filter(
                    Lead.email==contact['email']
                ).first()
                if not existing_lead_with_email:
                    lead.email = contact['email']

                    # Increment the current step of the lead
                    lead.id_step = neverbounce_step.id_
                    print('Setting email and promoting...')
                else:
                    lead.has_failed_on_step = True
                    lead.failed_reason = 'lead with email already exists'
                    print('Lead with email already exists...')
                    continue

                # Update the old bridge table value as the lead is getting promoted
                lead_bridge_step.exited_on = datetime.now()

                # Only add bridge row if not already present
                existing_new_lead_bridge_step = LeadBridgeStep.filter(
                    filters={
                        'id_lead': lead.id_,
                        'id_step': neverbounce_step.id_,
                    },
                )
                if not existing_new_lead_bridge_step:
                    new_lead_bridge_step = LeadBridgeStep({
                        'id_lead': lead.id_,
                        'id_step': neverbounce_step.id_,
                        'entered_on': datetime.now(),
                    })
                    db.session.add(new_lead_bridge_step)
                    print('Creating new bridge row...')

        return {}

    def dump_leads(data):
        ids_lead = data['ids_lead']
        id_failed_reason = data.get('id_failed_reason')

        leads = []
        errors = []
        # Check if leads exist
        for id_lead in ids_lead:
            lead = Lead.get_one(id_lead)
            if not lead:
                errors.append({
                    'field': 'ids_lead',
                    'description': 'One or more leads do not exist'
                })
            else:
                leads.append(lead)

        # Check if leads are in a step
        for lead in leads:
            if not lead.id_step:
                errors.append({
                    'field': 'ids_lead',
                    'description': 'One or more leads are not part of any step'
                })

        # Check if id_failure_reason exists
        failed_reason = None
        if id_failed_reason:
            failed_reason = FailedReason.get_one(id_failed_reason, with_organization=False)
            if not failed_reason:
                errors.append({
                    'field': 'id_failed_reason',
                    'description': 'Invalid ID for failed reason',
                })

        if errors:
            raise InvalidRequestData(errors)

        for lead in leads:
            lead.has_failed_on_step = True
            lead.failed_reason = 'manual'

            if failed_reason:
                lead.id_failed_reason = failed_reason.id_

        return None


class NeverbounceActions():
    def get_apis():
        return  {
            'submit': {
                'endpoint': 'https://api.neverbounce.com/v4/jobs/create',
                'payload': {
                    'key': app.config.get('NEVERBOUNCE_API_KEY'),
                    'input_location': 'supplied',
                    'filename': 'EmailsToVerify.csv',
                    'auto_start': 1,
                    'auto_parse': 1,

                    # List of emails and names
                    'input': [],
                },
            },
            'check': {
                'endpoint': 'https://api.neverbounce.com/v4/jobs/status',
                'params': {
                    'key': app.config.get('NEVERBOUNCE_API_KEY'),

                    # This is found in the response of the submit API
                    'job_id': None,
                },
            },
            'download': {
                'endpoint': 'https://api.neverbounce.com/v4/jobs/download',
                'params': {
                    'key': app.config.get('NEVERBOUNCE_API_KEY'),

                    # This is found in the response of the submit API
                    'job_id': None,
                },
            },
        }

    def submit_emails_to_neverbounce():
        # Fetch all leads in step 'verifying_emails_using_neverbounce'
        # that haven't started
        current_steps = Step.filter(
            filters={
                'token': 'verifying_emails_using_neverbounce'
            },
            first_item=True,
            get_details=False,
        )
        current_step = current_steps[0]

        next_steps = Step.filter(
            filters={
                'token': 'verifying_emails_using_scrubby'
            },
            first_item=True,
            get_details=False,
        )
        next_step = next_steps[0]

        query = db.session.query(Lead, LeadBridgeStep)\
            .join(
                LeadBridgeStep,
                and_(
                    Lead.id_ == LeadBridgeStep.id_lead,
                    LeadBridgeStep.id_step == current_step.id_,
                )
            )\
            .filter(
                or_(
                    LeadBridgeStep.external_job_started_on.is_(None),
                    LeadBridgeStep.external_job_requires_retry.is_(True),
                )
            )\
            .filter(
                Lead.has_failed_on_step.isnot(True)
            )

        if app.config.get('APP_ENV') != 'live':
            ic('Non-live environment detected, so only emails of 2 leads are being verified')
            query = query.limit(2)

        results = query.all()

        email_name_lists = []
        for lead, lead_bridge_step in results:
            # Don't include it if email status was updated in the last 5 days
            # This shouldn't happen on live as leads with updated email
            # statuses would have already been promoted to the next step.
            #
            # Also don't include if emails are part of an active job
            if lead.email_status_updated_on and\
                    lead.email_status_updated_on < datetime.now().date() - timedelta(days=5):
                # promote to next step
                lead.id_step = next_step.id_
                lead_bridge_step.exited_on = datetime.now()
            else:
                email_name_lists.append([lead.email, lead.name])

        ic(len(email_name_lists))
        ic(email_name_lists, '+++++++++++++++++')
        api = NeverbounceActions.get_apis()['submit']
        payload = copy.deepcopy(api['payload'])

        payload['input'] = email_name_lists

        r = requests.post(
            api['endpoint'],
            json=payload,
        )
        for lead, lead_bridge_step in results:
            lead_bridge_step.external_job_started_on = datetime.now()

        # Create entry in neverbounce_validation_attempts table
        neverbounce_validation_attempt = NeverbounceValidationAttempt({
            'request_payload': payload,
            'status': 'pending',
            'submitted_on': datetime.now(),
        })
        db.session.add(neverbounce_validation_attempt)
        if r.status_code == 200:
            data = r.json()
            neverbounce_validation_attempt.job_response_payload = data

            print(data)
            if data['status'] != 'success':
                neverbounce_validation_attempt.external_status = 'error'
                neverbounce_validation_attempt.external_status_on = datetime.now()
                print(f"Neverbounce error status:", data['status'])

                for lead, lead_bridge_step in results:
                    lead_bridge_step.external_job_requires_retry = True
            else:
                for lead, lead_bridge_step in results:
                    lead_bridge_step.external_job_requires_retry = False

                neverbounce_validation_attempt.external_status = 'pending'
                neverbounce_validation_attempt.external_status_on = datetime.now()
                neverbounce_validation_attempt.external_job_id = data['job_id']
                return data['job_id']

        elif 400 <= r.status_code < 500:
            neverbounce_validation_attempt.external_status = 'error'
            neverbounce_validation_attempt.external_status_on = datetime.now()
            print(f"Client error occurred: {r.status_code} {r.reason}")

            for lead, lead_bridge_step in results:
                lead_bridge_step.external_job_requires_retry = True
        else:
            neverbounce_validation_attempt.external_status = 'error'
            neverbounce_validation_attempt.external_status_on = datetime.now()
            print(f"Server error occurred: {r.status_code} {r.reason}")

            for lead, lead_bridge_step in results:
                lead_bridge_step.external_job_requires_retry = True
        return r.reason

    def check_emails_submitted_to_neverbounce(data):
        api = NeverbounceActions.get_apis()['check']
        params = copy.deepcopy(api['params'])
        params['job_id'] = data['job_id']

        r = requests.get(
            api['endpoint'],
            params=params,
        )
        if r.status_code == 200:
            data = r.json()

            print(data)
            if data.get('job_status') == 'failed':
                print(f'Job failed for some reason')
                return 'failed'
            elif data.get('status') != 'success':
                print(f'Neverbounce error status:', data['status'])
                return 'incomplete'
            else:
                ic(data)
                return 'complete'

        elif 400 <= r.status_code < 500:
            print(f"Client error occurred: {r.status_code} {r.reason}")
        else:
            print(f"Server error occurred: {r.status_code} {r.reason}")

        return 'failed'

    def fetch_email_statuses_from_neverbounce(data):
        # Check status first and update the attempt row

        api = NeverbounceActions.get_apis()['download']
        params = copy.deepcopy(api['params'])
        params['job_id'] = data['job_id']

        r = requests.get(
            api['endpoint'],
            params=params,
        )
        if r.status_code == 200:
            if r.headers.get('Content-Type') == 'application/json':
                data = r.json()
                if data.get('job_status') == 'failed':
                    print(f'Job failed for some reason')
                    return 'failed'
                elif data.get('status') != 'success':
                    print(f'Neverbounce error status:', data['status'])
                    return 'incomplete'
                return 'failed'
            else:
                # Save the content of the response as a CSV file
                with open('downloaded_file.csv', 'wb') as file:
                    file.write(r.content)

                # Read the CSV file
                with open('downloaded_file.csv', mode='r', encoding='utf-8') as file:
                    csv_reader = csv.reader(file)

                    # Iterate over each row in the CSV file
                    rows = []
                    for row in csv_reader:
                        print(row)  # Print each row
                        rows.append(row)
                return rows

        elif 400 <= r.status_code < 500:
            print(f"Client error occurred: {r.status_code} {r.reason}")
        else:
            print(f"Server error occurred: {r.status_code} {r.reason}")

        return 'failed'
        # return r.json()

    def check_and_fetch_all_neverbounce_jobs():
        attempts = NeverbounceValidationAttempt.query.filter(
            NeverbounceValidationAttempt.status == 'pending'
        ).all()

        for attempt in attempts:
            job_id = attempt.external_job_id
            job_status = NeverbounceActions.check_emails_submitted_to_neverbounce({
                'job_id': job_id,
            })

            attempt.checked_on = datetime.now()

            if job_status == 'failed':
                # Handle failed job
                attempt.check_completed_on = datetime.now()
                attempt.status = 'complete'
                continue
            elif job_status == 'incomplete':
                attempt.status = 'pending'
                continue

            attempt.check_completed_on = datetime.now()
            attempt.status = 'complete'

            # Fetch the results
            rows = NeverbounceActions.fetch_email_statuses_from_neverbounce({
                'job_id': job_id,
            })
            attempt.fetched_on = datetime.now()

            if rows == 'failed':
                continue
            elif rows == 'incomplete':
                continue
            else:
                for row in rows:
                    email = row[0]
                    neverbounce_status = row[-1]
                    # Get lead and bridge row
                    current_steps = Step.filter(
                        filters={
                            'token': 'verifying_emails_using_neverbounce'
                        },
                        first_item=True,
                        get_details=False,
                    )
                    current_step = current_steps[0]

                    next_steps = Step.filter(
                        filters={
                            'token': 'verifying_emails_using_scrubby'
                        },
                        first_item=True,
                        get_details=False,
                    )
                    next_step = next_steps[0]

                    skip_steps = Step.filter(
                        filters={
                            'token': 'pending_enrichment'
                        },
                        first_item=True,
                        get_details=False,
                    )
                    skip_step = skip_steps[0]

                    # Search for lead with the email
                    result = db.session.query(Lead, LeadBridgeStep)\
                        .join(
                            LeadBridgeStep,
                            and_(
                                Lead.id_ == LeadBridgeStep.id_lead,
                                LeadBridgeStep.id_step == current_step.id_,
                            )
                        )\
                        .filter(
                            Lead.email == email,
                        ).first()

                    lead, lead_bridge_step = result

                    # Update the status and do promotion to a step if eligible
                    lead.email_status = neverbounce_status
                    lead.email_status_updated_on = datetime.now()

                    # Push to enrichment step
                    if neverbounce_status == 'valid':
                        lead.id_step = skip_step.id_

                        # Only add bridge row if not already present
                        existing_skip_lead_bridge_step = LeadBridgeStep.filter(
                            filters={
                                'id_lead': lead.id_,
                                'id_step': skip_step.id_,
                            },
                        )
                        if not existing_skip_lead_bridge_step:
                            skip_lead_bridge_step = LeadBridgeStep({
                                'id_lead': lead.id_,
                                'id_step': skip_step.id_,
                                'entered_on': datetime.now(),
                            })
                            db.session.add(skip_lead_bridge_step)

                    # Push to scrubby step
                    elif neverbounce_status in ('catchall', 'accept_all_unverifiable', 'unknown'):
                        lead.id_step = next_step.id_

                        # Only add bridge row if not already present
                        existing_next_lead_bridge_step = LeadBridgeStep.filter(
                            filters={
                                'id_lead': lead.id_,
                                'id_step': next_step.id_,
                            },
                        )
                        if not existing_next_lead_bridge_step:
                            next_lead_bridge_step = LeadBridgeStep({
                                'id_lead': lead.id_,
                                'id_step': next_step.id_,
                                'entered_on': datetime.now(),
                            })
                            db.session.add(next_lead_bridge_step)
                    else:
                        lead.has_failed_on_step = True
                        lead.failed_reason = 'Email found to be either invalid or disposable'

                    # Update bridge row
                    lead_bridge_step.external_job_completed_on = datetime.now()
                    lead_bridge_step.exited_on = datetime.now()
                    lead_bridge_step.external_job_status = neverbounce_status


class EmailNewsletterActions():
    def get_email_newsletters_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': EmailNewsletter.id_,

        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = EmailNewsletter.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = EmailNewsletter.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with EmailNewsletter,
        # create result map, else create users_details.
        email_newsletters_details = []
        for result in results:
            email_newsletter_details = result.EmailNewsletter.get_details()
            email_newsletters_details.append(email_newsletter_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return EmailNewsletter.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=email_newsletters_details,
            )

        return email_newsletters_details

    def email_newsletter_data_validation(data, errors, id_=None):
        if 'name' in data and data['name']:
            existing_newsletter = EmailNewsletter.query.filter(
                EmailNewsletter.name == data['name'].lower(),
                EmailNewsletter.is_deleted == False
            ).first()
            if existing_newsletter and (not id_ or id_ != existing_newsletter.id_):
                errors.append({
                    'field': 'data.name',
                    'description': 'Newsletter with name already exists',
                })

        if 'token' in data and data['token']:
            existing_newsletter = EmailNewsletter.query.filter(
                EmailNewsletter.token == data['token'].lower(),
                EmailNewsletter.is_deleted == False
            ).first()
            if existing_newsletter and (not id_ or id_ != existing_newsletter.id_):
                errors.append({
                    'field': 'data.token',
                    'description': 'Newsletter with token already exists',
                })

        return errors

    def create(data):
        errors = []
        errors = EmailNewsletterActions.email_newsletter_data_validation(
            data=data,
            errors=errors,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        email_newsletter = EmailNewsletter(data)
        db.session.add(email_newsletter)
        db.session.flush()

        params = {
            'id_': str(email_newsletter.id_)
        }

        return EmailNewsletterActions.get_email_newsletters_details(params=params)


    def get_all(params={}):
        return EmailNewsletterActions.get_email_newsletters_details(params=params)

    def get(id_):
        email_newsletter = EmailNewsletter.get_one(id_, with_organization=False)

        if not email_newsletter:
            raise ResourceNotFound

        params = {
            'id_': str(email_newsletter.id_)
        }

        return EmailNewsletterActions.get_email_newsletters_details(params=params)

    def update(id_, data):
        email_newsletter = EmailNewsletter.get_one(id_, with_organization=False)

        if not email_newsletter:
            raise ResourceNotFound

        errors = []
        errors = EmailNewsletterActions.email_newsletter_data_validation(
            data=data,
            errors=errors,
            id_=id_,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        email_newsletter.update(data)

        params = {
            'id_': str(email_newsletter.id_)
        }

        return EmailNewsletterActions.get_email_newsletters_details(params=params)


class EmailSubscriberActions():
    def get_email_subscribers_details(params={}):
        filterable_and_sortable_fields = {
            # front end key: actual column
            'id_': EmailSubscriber.id_,

        }

        outerjoins = [
            # To_Model, To_Model.Column_name, From_Model.Column_name
            Lead, Lead.id_, EmailSubscriber.id_lead,
        ]

        # Note
        # Write sub queries for 1 * N and N * N relational models,
        # only if you want the count or to apply filters on those models.

        # sub query

        q = EmailSubscriber.get_all_objects(
            params=params,
            outerjoins=outerjoins,
            filterable_and_sortable_fields=filterable_and_sortable_fields,
            with_organization=False,
        )

        # Get the count before applying pagination
        count = q.count()

        # Get paginated_query
        (q, page, page_size) = EmailSubscriber.add_pagination_to_query(
            q=q,
            params=params,
        )

        # Fetch the results
        results = q.all()

        # Get all ids of the above results object

        # Pass ids as an parameter to respective model and get those objects,
        # of 1 * N and N * N. They should be queried separately.

        # If 1 * N and N * N relationship with EmailSubscriber,
        # create result map, else create users_details.
        email_subscribers_details = []
        for result in results:
            email_subscriber_details = result.EmailSubscriber.get_details()
            email_subscribers_details.append(email_subscriber_details)

        # If the `page` param is set, return the data with the
        # params details
        if page:
            return EmailSubscriber.return_with_summary(
                page=page,
                count=count,
                page_size=page_size,
                objects=email_subscribers_details,
            )

        return email_subscribers_details

    def email_subscriber_data_validation(data, errors, id_=None):
        # Validate id_lead foreign key
        if data.get('id_lead'):
            lead = Lead.get_one(data.get('id_lead'))
            if not lead:
                errors.append({
                    'field': f'data.id_lead',
                    'description': 'Lead with the ID does not exist',
                })

        # Validate id_company foreign key
        if data.get('id_company'):
            company = Company.get_one(data.get('id_company'))
            if not company:
                errors.append({
                    'field': f'data.id_company',
                    'description': 'Company with the ID does not exist',
                })

        # Validate id_email_newsletter foreign key
        if data.get('id_email_newsletter'):
            email_newsletter = EmailNewsletter.get_one(data.get('id_email_newsletter'))
            if not email_newsletter:
                errors.append({
                    'field': f'data.id_email_newsletter',
                    'description': 'Email Newsletter with the ID does not exist',
                })

        return errors

    def create(data):
        errors = []
        errors = EmailSubscriberActions.email_subscriber_data_validation(
            data=data,
            errors=errors,
        )

        # Check if too many emails from the same IP address
        time_one_minute_ago = datetime.now() - timedelta(minutes=1)
        subs_count = EmailSubscriber.query.filter(
            EmailSubscriber.ip_address==request.remote_addr,
            EmailSubscriber.created_at>time_one_minute_ago,
        ).count()

        if subs_count > 3:
            errors.append({
                'field': 'data.email',
                'description': 'Too many requests. Please try again later!'
            })

        # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        # Validate for same email
        if 'email' in data and data['email']:
            existing_subscriber = EmailSubscriber.query.filter(
                EmailSubscriber.email == data['email'].lower(),
                EmailSubscriber.is_deleted == False
            ).first()
            if existing_subscriber:
                email_subscriber_details = EmailSubscriberActions._get_details(
                    existing_subscriber.id_
                )
                return email_subscriber_details

        data['ip_address'] = request.remote_addr
        data['subscribed_on'] = datetime.now()
        data['status'] = 'active'
        data['id_email_newsletter'] = EmailNewsletter.query.filter(
            EmailNewsletter.token=='software_development',
        ).first().id_

        email_subscriber = EmailSubscriber(data)
        db.session.add(email_subscriber)
        db.session.flush()

        email_subscriber_details = EmailSubscriberActions._get_details(email_subscriber.id_)
        return email_subscriber_details

    def _get_details(id_):
        email_subscriber_details = EmailSubscriber.filter(
            filters={
                'id_': id_,
            },
            joins=[
                (EmailNewsletter, 'id_email_newsletter', 'email_newsletter_details'),
                (Lead, 'id_lead', 'lead_details'),
                (Company, 'id_company', 'company_details'),
            ],
            first_item=True,
        )

        return email_subscriber_details

    def get_all(params={}):
        email_subscribers_details = EmailSubscriber.filter(
            # filters={
            #     'id_': 3,
            # },
            pagination={
                'page': params.get('page'),
                'page_size': params.get('page_size'),
            },
            reverse_order=False,
            joins=[
                (EmailNewsletter, 'id_email_newsletter', 'email_newsletter_details'),
                (Lead, 'id_lead', 'lead_details'),
                (Company, 'id_company', 'company_details'),
            ],
            first_item=False,
        )

        return email_subscribers_details

    def get(id_):
        email_subscriber = EmailSubscriber.get_one(id_, with_organization=False)

        if not email_subscriber:
            raise ResourceNotFound

        email_subscriber_details = EmailSubscriberActions._get_details(email_subscriber.id_)
        return email_subscriber_details

    def update(id_, data):
        email_subscriber = EmailSubscriber.get_one(id_, with_organization=False)

        if not email_subscriber:
            raise ResourceNotFound

        errors = []
        errors = EmailSubscriberActions.email_subscriber_data_validation(
            data=data,
            errors=errors,
            id_=id_,
        )

         # Throw the errors and stop the execution, if any errors found.
        if errors:
            raise InvalidRequestData(
                errors
            )

        email_subscriber.update(data)

        email_subscriber_details = EmailSubscriberActions._get_details(email_subscriber.id_)
        return email_subscriber_details

