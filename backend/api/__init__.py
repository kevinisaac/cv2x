import os
import uuid
import logging
import json

from flask import Blueprint, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity, JWTManager, get_jwt
from zephony.helpers import (
    responsify,
)
from pprint import pprint
from datetime import datetime, timezone
from zephony.models import db
from zephony.exceptions import (
    InvalidRequestData,
    ResourceNotFound,
    AccessForbidden,
    UnauthorizedAccess,
    ServerError,
)

from backend.models.user import User, bcrypt
from backend.models.role import Role
from backend.models.request_response_log import RequestResponseLog

api = Blueprint('api', __name__)
jwt = JWTManager()
logger = logging.getLogger(__name__)

# TODO: DB connection and committing transactions on this layer - discuss
@api.before_request
@jwt_required(optional=True)
def before_request():
    """
    This method gets executed every time the routes in the `api` blueprint is
    requested. Before executing any actions of the API, this method will be
    executed. It loads the user details before any API request, if the user
    is logged in.
    """

    print('----------------------------------------------------------')

    # Rollback if any previous session has a blocked database connections
    try:
        old_db_connection = db.session.connection()
    except Exception as e:
        logger.debug(e)
        db.session.rollback()

    al = request.headers.get('Accept-Language')

    if al:  # Normalizing
        al = al.lower()

    # TODO: Rewrite request language for future requirement
    if al == 'en':
        request.language = 'en'
    elif al == 'en-us':
        request.language = 'en'
    else:
        request.language = 'en'

    # print('vars(request.headers) :', vars(request.headers))

    # Uniquely identify each request
    g.uuid = str(uuid.uuid4())
    g.url = request.url
    g.method = request.method
    g.start_date_time = datetime.now(timezone.utc)

    # Set the request payload and params to request object.
    request.params = request.args.to_dict()
    request.payload = request.files.getlist('files')\
        if request.files.getlist('files') else request.get_json()

    try:
        request.jwt = get_jwt()
        request.user = User.get_one(get_jwt_identity()['id'], with_organization=False)
        user_role = Role.get_one(request.user.id_role)
        request.role_permission_bit_sequence = user_role.permission_bit_sequence\
            if user_role and user_role.permission_bit_sequence else '0'
    except Exception as e:
        logger.debug(e)
        request.user = None
        request.jwt = {}
        request.role_permission_bit_sequence = '0'

    if request and request.user:
        g.user_id = request.user.id_
    else:
        logger.info('No/Invalid Token')

    print(request.payload)

    if get_jwt_identity() and 'id_organization' not in get_jwt_identity():
        raise UnauthorizedAccess(message='Please login again')

    request.lang = None

@api.after_request
def after_request_func(response):
    g.status_code = response.status_code
    g.end_date_time = datetime.now(timezone.utc)

    # Rollback if the response status code is 500+
    if response.status_code > 499:
        db.session.rollback()

    if request.method != 'GET':
        try:
            request_response_data = {
                'status_code': g.status_code,
                'complete_url': request.base_url,
                'request_method': request.method,
                'request_uuid': g.uuid,

                'request_headers': dict(request.headers),
                'response_headers': dict(response.headers),

                'request_start_time': g.start_date_time,
                'request_end_time': g.end_date_time,

                'query_params': request.args.to_dict(),
                'request_payload': request.get_json(),
                'response_payload': json.loads(response.response[0].decode('utf8'))\
                    if response.headers.get('content-type', '') == 'application/json' else None
            }

            request_response_object = RequestResponseLog(request_response_data)
            g.request_response_id = request_response_object.id_

        except Exception as e:
            logger.info('Error while updating request-response model')

        db.session.commit()

    return response

######################
# Exception related
######################
@api.errorhandler(InvalidRequestData)
def handle_invalid_request_data(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    return responsify(e.errors, e.message, e.http_status)


@api.errorhandler(UnauthorizedAccess)
def handle_unauthorized(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    return responsify(None, e.message, 401)


@api.errorhandler(AccessForbidden)
def access_forbidden(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    return responsify(e.errors, e.message, 403)


@api.errorhandler(ResourceNotFound)
def handle_resource_not_found(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    return responsify(e.errors, e.message, 404)


@api.errorhandler(ServerError)
def server_error(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    return responsify(e.errors, 'Something wrong happened', 500)


@api.errorhandler(500)
def internal_server_error(e):
    """
    Make the error format understandable and relatable for the HTTP client.
    """

    # Rollback the data of current session which ran into an exception.
    try:
        old_db_connection = db.session.connection()
    except Exception as e:
        logger.debug(e)
        db.session.rollback()

    return responsify(
        [],
        'This should not happen, please report the process to Admin',
        500
    )


######################
# JWT related
######################
@jwt.additional_claims_loader
def add_claims_to_access_token(user):
    """
    This function will be called whenever create_access_token is used.
    It will take whatever object is passed into the create_access_token
    method, and lets us define what custom claims should be added to the
    access token.
    """

    return {
        'id': user.id_,
        'created_at': user.created_at,
        'id_organization': user.id_organization,
    }


@jwt.user_identity_loader
def user_identity_lookup(user):
    """
    This function will be called whenever create_access_token is used.
    It will take whatever object is passed into the create_access_token
    method, and lets us define what the identity of the access token
    should be.
    """

    identity = {
        'id': user.id_,
        'created_at': user.created_at,
        'id_organization': user.id_organization,
    }

    return identity


@jwt.expired_token_loader
def my_expired_token_callback():
    """
    This function will be called whenever an expired but otherwise
    valid access token attempts to access an endpoint.
    """

    errors = [{
        'field': 'jwt',
        'description': 'Token has expired'
    }]

    # TODO: Check if it is responsified twice
    return responsify(errors, 'Expired JWT', 401)


@jwt.invalid_token_loader
@jwt.unauthorized_loader
def invalid_token_callback(self):
    errors = [{
        'field': 'jwt',
        'description': 'Token is invalid'
    }]
    return responsify(errors, 'User is not logged in', 401)


# IMPORTANT: For flask to pick up the routes
from backend.api.resources import *

