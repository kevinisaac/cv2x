import logging

from sqlalchemy import text
from flask_bcrypt import Bcrypt
from sqlalchemy.sql import expression
from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import JSONB
from ..json_data import json_data

logger = logging.getLogger(__name__)
bcrypt = Bcrypt()

class User(BaseModel):
    """
    This model defines a user in the organisation that can use the application.
    """

    __tablename__ = 'users'

    name = db.Column(db.String, index=True)
    username = db.Column(db.String, unique=True, index=True)

    status = db.Column(db.String, default=json_data['user_statuses']['invited'], index=True)
    # status = db.Column(db.String)

    email = db.Column(db.String, unique=True, index=True)
    email_verification_otp = db.Column(db.String)
    email_otp_expires_at = db.Column(db.DateTime)
    is_email_verified = db.Column(
        db.Boolean, server_default=expression.false()
    )

    new_email = db.Column(db.String, unique=True, index=True)
    new_email_verification_token = db.Column(db.String)
    new_email_token_expires_at = db.Column(db.DateTime)

    password = db.Column(db.String)
    password_set_link_expires_at = db.Column(db.DateTime)
    password_set_token = db.Column(db.String)
    password_reset_link_expires_at = db.Column(db.DateTime)
    password_reset_token = db.Column(db.String)

    datetime_joined_at = db.Column(db.DateTime)
    last_login_at = db.Column(db.DateTime)

    is_staff = db.Column(db.Boolean)        # Only for historic purposes
    is_admin = db.Column(db.Boolean, server_default=expression.false())
    is_super_admin = db.Column(db.Boolean, server_default=expression.false())

    preferred_date_format = db.Column(db.String)
    preferred_time_format = db.Column(db.String)

    preferred_columns = db.Column(JSONB, server_default=text("'{}'::jsonb"), index=True)

    id_profile_picture = db.Column(db.Integer, db.ForeignKey('files.id', name='fk_files'), index=True)
    id_role = db.Column(db.Integer, db.ForeignKey('roles.id', name='fk_roles'), index=True)

    def __init__(self, data, from_seed_file=False):
        super(User, self).__init__(data)
        if 'password' in data and data['password']:
            self.password = bcrypt.generate_password_hash(
                data['password']
            ).decode('utf-8')
    
    readable_fields = [
        'name',
        'username',
        'status',
        'email',
        'is_email_verified',
        'new_email',
        'is_staff',
        'is_admin',
        'is_super_admin',
        'datetime_joined_at',
        'last_login_at',
        'is_staff',
        'is_admin',
        'preferred_date_format',
        'preferred_time_format',
    ]

    def check_password(self, password):
        """
        This function checks password validity and returns a boolean value.

        :param: An unhashed password is passed to the function

        :return: Boolean value
        """

        return bcrypt.check_password_hash(self.password, password)

    def update(self, data):
        """
        This function updates an user and returns the details of the updated
        user.

        :param data:

        :return dict: Details of the updated user.
        """
        # Use the super method to reuse the parent method
        super().update(data)

        if 'email' in data and data['email']:
            self.email = data['email'].lower()

        if 'new_email' in data and data['new_email']:
            self.new_email = data['new_email'].lower()

        if 'password' in data and data['password']:
            self.password = bcrypt.generate_password_hash(
                data['password']).decode('utf-8')

        if 'new_password' in data and data['new_password']:
            self.password = bcrypt.generate_password_hash(
                data['new_password']).decode('utf-8')

        return self


    def get_permissions_map(self):
        """
        This function is used to return the permissions map to be used by the
        frontend.
        """

        from .role import Role
        from .permission import Permission

        # 1. Get roles of current user
        role = Role.get_one(self.id_role)

        # 2. Get permissions of each role and OR them
        permission_bit_sequence = int(role.permission_bit_sequence) if role else 0

        # 3. Get the permission
        permissions = Permission.get_all()

        # 4. Generate the map
        permissions_map = {}
        for permission in permissions:
            if self.is_admin:
                permissions_map[permission.token] = True
            elif int(permission.permission_bit) & int(permission_bit_sequence):
                permissions_map[permission.token] = True
            else:
                permissions_map[permission.token] = False

        return permissions_map

