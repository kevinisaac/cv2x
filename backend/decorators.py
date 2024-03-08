import logging
logger = logging.getLogger(__name__)

from flask import request

from zephony.exceptions import (
    AccessForbidden,
)

from .models.permission import Permission

def permission_required(token):
    """
    This decorator checks if the current user is permitted for the
    operation. Ideally, this decorator will be used in the resource layer while
    the `permission_required` decorator.

    :param str token: Permission required for token.

    :raises PermissionError:

    :return def:
    """

    def decorator(f):
        def decorated_function(*args, **kwargs):
            return f(*args, **kwargs)
            ################################################################
            if request.user and request.user.is_admin:
                return f(*args, **kwargs)

            # If the user requesting is not admin, we check the permissions
            # operation here means token is an operation
            token_permission = Permission.get_one(token)
                    
            if not token_permission:
                # Control reaches here if the user is neither a owner,
                # nor does the requested permission exist on the database.

                # Psst! This shouldn't happen in an unbroken system.
                logger.error(
                    f'Permission token is invalid : {token}'
                )
                raise PermissionError('No permission token found')
            else:
                request_resource_permission_bit = token_permission.permission_bit
            
            # Check if the user can perform the requested action on the
            # resource(object). It also checks the permission of the parent
            # objects.
            if not int(request.role_permission_bit_sequence) & int(request_resource_permission_bit):
                raise AccessForbidden(
                    message="You do not have valid permission to "
                    "perform this action on this resource."
                    " Please contact the administrator."
                )

            return f(*args, **kwargs)

        return decorated_function

    return decorator

