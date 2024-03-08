import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import JSONB


logger = logging.getLogger(__name__)

class FieldType(BaseModel):
    __tablename__ = 'field_types'

    name = db.Column(db.String)
    description = db.Column(db.String)

    type_ = db.Column('type', db.String)    # Allowed values in validator??
    is_required = db.Column(db.Boolean, default=False)

    options = db.Column(JSONB, default={})

    id_field_group = db.Column(db.Integer, db.ForeignKey('field_groups.id'))

    readable_fields = [
        'name',
        'type_',
        'options',
        'description',
        'is_required',
    ]

    def validate_field(self, value):
        """
        This function is used to validate any custom field value by checking if it's
        allowed, data type matches, if the value is within the expected parameters, etc.

        :param int/str/bool/list: The value that has to be validated

        :raise ValueError:

        :return True:
        """

        field_type_data_type_map = {
            'int': int,
            'date': str,
            'time': str,
            'str': str,
            'single_line_text': str,
            'multi_line_text': str,
            'dropdown': str,
            'multi_choice_dropdown': list,
            'boolean': bool,

            'url': str,
            'file_url': str,
            'media_url': str,
        }

        # Syntax validation
        if type(value) is not field_type_data_type_map[self.type_]:
            raise Exception(
                'Value `{}` for field `{}` is not allowed'.format(
                    value,
                    self.name,
                )
            )

        # Semantic validation
        # TODO: Convert datetime into datetime object before comparision
        if self.type_ in ('int'):
            if (self.options.get('max') and value > int(self.options['max'])) \
                    or (self.options.get('min') and value < int(self.options['min'])):
                raise Exception(
                    'Value for field `{}` is out of allowed range: {} - {}'.format(
                        self.id_,
                        self.options['min'],
                        self.options['max'],
                    )
                )
        
        if self.type_ in ('date'):
            if (self.options.get('max') and value > self.options['max']) \
                    or (self.options.get('min') and value < self.options['min']):
                raise Exception(
                    'Value for field `{}` is out of allowed range: {} - {}'.format(
                        self.id_,
                        self.options['min'],
                        self.options['max'],
                    )
                )

        # Check string length
        if self.type_ in ('single_line_text', 'multi_line_text', 'url', 'file_url', 'media_url', 'str'):
            # Check range
            if (self.options.get('max') and len(value) > int(self.options['max'])) or \
                    (self.options.get('min') and len(value) < int(self.options['min'])):
                raise Exception(
                    'Length for field `{}` is out of allowed range: {} - {}'.format(
                        self.id_,
                        self.options['min'],
                        self.options['max'],
                    )
                )

        # Check if in allowed values list
        if self.type_ == 'dropdown':
            options = [v['value'] for v in self.options['items']]
            # print(options)
            # print(value)
            if value not in options:
                raise Exception(
                    'Value `{}` for field `{}` is not allowed'.format(
                        value,
                        self.id_,
                    )
                )

        # Check if in allowed values list
        if self.type_ == 'multi_choice_dropdown':
            possible_values = [v['value'] for v in self.options['items']]
            given_values = value
            for each_value in given_values:
                if each_value not in possible_values:
                    raise Exception(
                        'Value `{}` for field `{}` is not allowed'.format(
                            each_value,
                            self.id_,
                        )
                    )

        return True

