import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy import text

logger = logging.getLogger(__name__)

class Company(BaseModel):
    __tablename__ = 'companies'

    name = db.Column(db.String)
    short_name = db.Column(db.String)
    ultra_short_name = db.Column(db.String)

    website_url = db.Column(db.String)
    primary_domain = db.Column(db.String)
    status = db.Column(db.String, default='active')
    logo_path = db.Column(db.String)
    founded_year = db.Column(db.Integer, index=True)
    description = db.Column(db.Text)

    employee_count = db.Column(db.Integer)
    employee_count_min = db.Column(db.Integer)
    employee_count_max = db.Column(db.Integer)

    annual_revenue = db.Column(db.BigInteger)
    annual_revenue_min = db.Column(db.BigInteger)
    annual_revenue_max = db.Column(db.BigInteger)

    custom_fields = db.Column(JSONB, server_default=text("'{}'::jsonb"))

    apollo_organization_id = db.Column(db.String)

    id_industry = db.Column(
        db.Integer, db.ForeignKey('industries.id', name='fk_industries'), index=True
    )
    id_company_type = db.Column(
        db.Integer, db.ForeignKey('company_types.id', name='fk_company_types'), index=True
    )
    id_address = db.Column(
        db.Integer, db.ForeignKey('addresses.id', name='fk_addresses'),
    )

    readable_fields = [
        'name',
        'short_name',
        'ultra_short_name',
        'status',
        'logo_path',
        'website_url',
        'primary_domain',
        'founded_year',
        'description',

        'employee_count',
        'employee_count_min',
        'employee_count_max',

        'annual_revenue',
        'annual_revenue_min',
        'annual_revenue_max',
    ]

    email_usable_fields = [
        'name',
        'short_name',
        'ultra_short_name',

        'founded_year',

        'employee_count',
        'employee_count_min',
        'employee_count_max',

        'annual_revenue',
        'annual_revenue_min',
        'annual_revenue_max',
    ]

    def __init__(self, data, from_seed_file=False):
        if 'custom_fields' in data and data['custom_fields']:
            custom_fields_map = {}
            for id_field_type, value in data['custom_fields'].items():
                custom_fields_map[id_field_type] = value
            data['custom_fields'] = custom_fields_map

        # Use the super method to reuse the parent method
        super(Company, self).__init__(data)

    def update(self, data):
        if 'custom_fields' in data and data['custom_fields']:
            custom_fields_map = self.custom_fields or {}
            for id_field_type, value in data['custom_fields'].items():
                custom_fields_map[id_field_type] = value
            data['custom_fields'] = custom_fields_map

        # Use the super method to reuse the parent method
        super().update(data)

