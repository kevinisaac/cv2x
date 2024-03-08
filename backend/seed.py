"""
Used to create tables and add data by default.
"""

import os
import re
import csv
import click
import openpyxl

from flask.cli import with_appcontext
from zephony.models import BaseModel, db
from .configs.config import SQLALCHEMY_DATABASE_URI
from sqlalchemy import inspect
from sqlalchemy_utils import database_exists, drop_database, create_database

from datetime import datetime, timedelta
from zephony.helpers import serialize_datetime, date_format

from . import logger
from .models import *

from .helpers import (
    get_list_from_string,
    get_boolean_from_string,
    get_json_from_string,
    get_camelcase_string,
)


APP_ENV = os.environ.get('APP_ENV', 'local')


def _convert_camel_to_snake(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def _export_csvs_from_spreadsheets(project_name='outreach'):
    base_xls = f'data/{project_name}_base_data.xlsx'
    main_xls = None
    # if os.environ.get('APP_ENV') == 'live':
    #     main_xls = f'data/{project_name}_live_data.xlsx'
    # elif os.environ.get('APP_ENV') == 'migrate':
    #     main_xls = None
    # else:
    #     main_xls = f'data/{project_name}_demo_data.xlsx'

    # Seed base data as it applies to all environment
    for data_xls in [base_xls, main_xls]:
        if not data_xls:
            logger.warning('Invalid XLS file!')
            continue

        logger.info('Exporting CSVs from `{}`..'.format(data_xls))
        wb = openpyxl.load_workbook(data_xls)

        # Export each sheet as CSV
        for sheetname in wb.sheetnames:
            print('sheetname:', sheetname)
            csv_path = 'data/exported_csv/{}.csv'.format(
                _convert_camel_to_snake(sheetname.replace(' ', ''))
            )

            with open(csv_path, 'w', newline='') as f:
                writer = csv.writer(f)
                for row in wb[sheetname].rows:
                    writer.writerow([cell.value for cell in row])


def seed_countries(row_commit):
    logger.info('- Creating country..')

    column_index = {
        'name': 1,
        'alpha_2': 2,
    }
    res = Country.load_from_csv(
        'data/exported_csv/countries.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating country!')

    return res


def seed_level_1_sub_divisions(row_commit):
    logger.info('- Creating states..')

    column_index = {
        'name': 1,
        # 'alpha_code': 2,
        'id_country': (2, int)
    }
    res = Level1SubDivision.load_from_csv(
        'data/exported_csv/level1_sub_divisions.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    logger.info('+ Done creating states!')

    return res


def seed_level_2_sub_divisions(row_commit):
    logger.info('- Creating districts..')

    column_index = {
        'name': 1,
        # 'alpha_code': 2,
        'id_country': (2, int),
        'id_level_1_sub_division': (3, int),
    }
    res = Level2SubDivision.load_from_csv(
        'data/exported_csv/level2_sub_divisions.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    logger.info('+ Done creating districts!')

    return res


def seed_cities(row_commit):
    logger.info('- Creating cities..')

    column_index = {
        'name': 1,
        # 'alpha_code': 2,
        'id_country': (2, int),
        'id_level_1_sub_division': (3, int),
        'id_level_2_sub_division': (4, int),
    }
    res = City.load_from_csv(
        'data/exported_csv/cities.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    logger.info('+ Done creating cities!')

    return res


def seed_users(row_commit):
    logger.info('- Creating users..')

    column_index = {
        'name': 1,
        'email': 2,
        'password': 3,
        'is_admin': (4, bool),
        'status': 5,
        'username': 6,
        # 'id_role': 7,
    }
    res = User.load_from_csv(
        'data/exported_csv/users.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating users!')

    users = User.get_all()
    for user in users:
        user.is_email_verified = True
        user.id_organization = 1

    db.session.flush()

    return res


def seed_roles(row_commit):
    logger.info('- Creating roles..')

    column_index = {
        'name': 1,
        # To remove the extra decimal
        'permission_bit_sequence': (2, lambda a: str(int(float(a)))),
    }
    res = Role.load_from_csv(
        'data/exported_csv/roles.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    roles = Role.get_all()
    for role in roles:
        role.id_organization = 1

    logger.info('+ Done creating roles!')

    return res


def seed_permissions(row_commit):
    logger.info('- Creating permissions..')

    column_index = {
        'permission_bit': (0, int, 'power_of_2'),
        'order_id': (1, int),
        'token': 2,
        'name': 3,
        'description': 4,
        'dependent_permissions_bit_sequence': (5, int)
    }
    res = Permission.load_from_csv(
        'data/exported_csv/permissions.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    logger.info('+ Done creating permissions!')

    return res


def seed_industries(row_commit):
    logger.info('- Creating industries..')

    column_index = {
        'name': 1,
    }
    res = Industry.load_from_csv(
        'data/exported_csv/industries.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating industries!')

    return res


def seed_companies(row_commit):
    logger.info('- Creating organization..')

    organization = Organization({'name': 'Zephony'})

    logger.info('- Done creating organization..')

    logger.info('- Creating companies..')

    column_index = {
        'name': 1,
        'short_name': 2,
        'ultra_short_name': 3,

        'id_industry': (4, int),
        # 'id_address': 1,
        # 'id_company_type': (10, int),
        # 'id_specialization': (11, int),

        'website_url': 12,
        # 'founded_date': 13,
        # 'annual_revenue': (14, int),

        # 'employee_count': (15, int),
        'description': 16,
    }
    res = Company.load_from_csv(
        'data/exported_csv/companies.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    companies = Company.get_all(with_organization=False)

    for index, each_company in enumerate(companies):
        each_company.unique_name = str(index)
        each_company.id_organization = organization.id_

    logger.info('+ Done creating companies!')

    return res


def seed_company_types(row_commit):
    logger.info('- Creating company_types..')

    column_index = {
        'name': 1,
    }
    res = CompanyType.load_from_csv(
        'data/exported_csv/company_types.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating company_types!')

    return res

def seed_leads(row_commit):
    pass


def seed_dummy_company_and_leads(row_commit):
    companies_details = [
        {
            "name": "Zephony Software Private Limited",
            "short_name": "Zephony",
            "ultra_short_name": "Zephony",
            "leads": [
                {
                    "name": "Kevin Isaac",
                    "first_name": "Kevin",
                    "last_name": "I",
                    "email": "kevin@zephony.tech",
                    "phone": "42453453",
                    "linkedin_url": "someurl",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                        3
                    ],
                    "is_unsubscribed": False,
                    "first_sentence": "Great stuff you're doing at your company, Kevin",
                    "last_sentence": "PS: Big fan of sunny days too ;)"
                },
                {
                    "name": "Paul Joy",
                    "first_name": "Paul",
                    "last_name": "Joy",
                    "email": "paul@zephony.com",
                    "phone": "42453453",
                    "linkedin_url": "someurl",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                        3
                    ],
                    "is_unsubscribed": False,
                    "first_sentence": "Great stuff you're doing at Zephony, Paul",
                    "last_sentence": "PS: Big fan of Cochin ;)"
                },
                {
                    "name": "Kevin Andrid",
                    "first_name": "Kevin",
                    "last_name": "Andrid",
                    "email": "andrid@zephony.com",
                    "phone": "42453453",
                    "linkedin_url": "someurl",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                        3
                    ],
                    "is_unsubscribed": False,
                    "first_sentence": "Great stuff you're doing at Zephony, Andrid",
                    "last_sentence": "PS: Big fan of Cbe ;)"
                },
            ]
        },
        {
            "name": "Zephony Labs",
            "short_name": "Zephony Labs",
            "ultra_short_name": "ZL",
            "leads": [
                {
                    "name": "Aravind Thangavelu",
                    "first_name": "Aravind",
                    "last_name": "Thangavelu",
                    "email": "aravind@zephony.com",
                    "phone": "42453453",
                    "linkedin_url": "someurl",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                        3
                    ],
                    "is_unsubscribed": False,
                    "first_sentence": "Great stuff you're doing at Zephony, Aravind",
                    "last_sentence": "PS: Big fan of Trichy ;)"
                },
            ]
        },
        {
            "name": "Zephony Test 1",
            "short_name": "Test 1",
            "ultra_short_name": "Test 1",
            "leads": [
                {
                    "name": "Other Than live",
                    "first_name": "Other",
                    "last_name": "Live",
                    "email": "emailtestingforotherthanlive@gmail.com",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                    ]
                },
                {
                    "name": "Demo Site",
                    "first_name": "Demo",
                    "last_name": "Site",
                    "email": "emailtestingfordemosite@gmail.com",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                    ]
                },
            ]
        },
        {
            "name": "Zephony Test 2",
            "short_name": "Test 2",
            "ultra_short_name": "Test 2",
            "leads": [
                {
                    "name": "Dev site",
                    "first_name": "Dev",
                    "last_name": "Site",
                    "email": "emailtestingfordevsite@gmail.com",
                    "status": "active",
                    "id_company": 1,
                    "id_designation": 1,
                    "ids_user": [
                        1,
                    ]
                },
            ]
        }
    ]

    for each_company_details in companies_details:
        organization = Organization({'name': each_company_details["name"]})
        company_data = {
            **each_company_details,
            'id_organization': organization.id_,
        }
        company_data.pop('leads', None)
        company = Company(company_data)
        if 'leads' in each_company_details and each_company_details['leads']:
            # Create 10 variants of each lead
            for i in range(0, 10):
                for each_lead_details in each_company_details['leads']:
                    data = { **each_lead_details }
                    data.pop('ids_user', None)
                    data['id_company'] = company.id_
                    data['name'] = data['name'] + f' {i}'
                    data['first_name'] = data['first_name'] + f' {i}'
                    data['last_name'] = data['last_name'] + f' {i}'
                    data['id_organization'] = organization.id_,
                    email = data['email']
                    email = '@'.join(
                        [
                            email.split('@')[0] + f'+{i}',
                            email.split('@')[1],
                        ]
                    )
                    data['email'] = email

                    lead = Lead(data)
                    if 'ids_user' in each_lead_details and each_lead_details['ids_user']:
                        for each_user_id in each_lead_details['ids_user']:
                            user_bridge_lead_linkedin = UserBridgeLeadLinkedin({
                                'id_lead': lead.id_,
                                'id_user': each_user_id,
                                'id_organization' : organization.id_,
                            })


def seed_specializations(row_commit):
    logger.info('- Creating specializations..')

    column_index = {
        'name': 1,
    }
    res = Specialization.load_from_csv(
        'data/exported_csv/specializations.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating specializations!')

    return res


def seed_designations(row_commit):
    logger.info('- Creating designations..')

    column_index = {
        'name': 1,
    }
    res = Designation.load_from_csv(
        'data/exported_csv/designations.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating designations!')

    return res


def seed_timezones(row_commit):
    logger.info('- Creating timezones..')

    column_index = {
        'name': 1,
        'short_name': 2,
        'utc_offset': 3,
    }
    res = Timezone.load_from_csv(
        'data/exported_csv/timezones.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating timezones!')

    return res


def seed_templates(row_commit):
    logger.info('- Creating templates..')

    column_index = {
        'name': 1,
        'title': 2,
        'body': 3,
    }
    res = Template.load_from_csv(
        'data/exported_csv/templates.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    templates = Template.get_all()
    for template in templates:
        template.id_organization = 1

    logger.info('+ Done creating templates!')

    return res


def seed_spintax_variables(row_commit):
    logger.info('- Creating spintax_variables..')

    column_index = {
        'name': 1,
        'token': 2,
        'id_template': (3, int),
    }
    res = SpintaxVariable.load_from_csv(
        'data/exported_csv/spintax_variables.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    spintax_variables = SpintaxVariable.get_all()
    for spintax_variable in spintax_variables:
        spintax_variable.id_organization = 1
    logger.info('+ Done creating spintax_variables!')

    return res


def seed_spintax_variants(row_commit):
    logger.info('- Creating spintax_variants..')

    column_index = {
        'id_spintax_variable': (1, int),
        'text': 2,
    }
    res = SpintaxVariant.load_from_csv(
        'data/exported_csv/spintax_variants.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    spintax_variants = SpintaxVariant.get_all()
    for spintax_variant in spintax_variants:
        spintax_variant.id_organization = 1
    logger.info('+ Done creating spintax_variants!')

    return res


def seed_campaigns(row_commit):
    logger.info('- Creating campaigns..')

    column_index = {
        'name': 1,
        'start_date': 2,
        'end_date': 3,

        'status': 4,
        'end_type': 5,
        'id_exhibit_app': (6, int),
    }
    res = Campaign.load_from_csv(
        'data/exported_csv/campaigns.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    campaigns = Campaign.get_all()
    for campaign in campaigns:
        campaign.id_organization = 1

    logger.info('+ Done creating campaigns!')

    return res


def seed_campaign_week_day_sessions(row_commit):
    logger.info('- Creating campaign_week_day_sessions..')

    column_index = {
        'id_campaign': (1, int),
        'week_day': (2, int),
        'start_time': 3,
        'end_time': 4,
    }
    res = CampaignWeekDaySession.load_from_csv(
        'data/exported_csv/campaign_week_day_sessions.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    campaign_week_day_sessions = CampaignWeekDaySession.get_all()
    for campaign_week_day_session in campaign_week_day_sessions:
        campaign_week_day_session.id_organization = 1

    logger.info('+ Done creating campaign_week_day_sessions!')

    return res


def seed_google_workspace_accounts(row_commit):
    logger.info('- Creating google_workspace_accounts..')

    column_index = {
        'email': 1,
    }
    res = GoogleWorkspaceAccount.load_from_csv(
        'data/exported_csv/google_workspace_accounts.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    google_workspace_accounts = GoogleWorkspaceAccount.get_all()
    for google_workspace_account in google_workspace_accounts:
        google_workspace_account.id_organization = 1

    logger.info('+ Done creating google_workspace_accounts!')

    return res


def seed_mail_accounts(row_commit):
    logger.info('- Creating mail_accounts..')

    column_index = {
        'email': 1,
        'id_domain': (2, int),

        'is_mailbox_created': (3, bool),
        'primary_email': 4,
        'warmup_started_on': 5,
        'id_warmup_service': (6, lambda x: int(float(x)) if x else None),
        'warmup_service_account': 7,
        'id_email_service_provider': (8, int),
        'notes': 9,
        'api_key': 10,
        'name': 11,
    }
    res = MailAccount.load_from_csv(
        'data/exported_csv/mail_accounts.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )

    mail_accounts = MailAccount.get_all()
    for mail_account in mail_accounts:
        mail_account.id_organization = 1

    logger.info('+ Done creating mail_accounts!')

    return res


def seed_warmup_services(row_commit):
    logger.info('- Creating warmup_services..')

    column_index = {
        'name': 1,
    }
    res = WarmupService.load_from_csv(
        'data/exported_csv/warmup_services.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    warmup_services = WarmupService.get_all()
    for warmup_service in warmup_services:
        warmup_service.id_organization = 1

    logger.info('+ Done creating warmup_services!')

    return res


def seed_email_service_providers(row_commit):
    logger.info('- Creating email_service_providers..')

    column_index = {
        'name': 1,
    }
    res = EmailServiceProvider.load_from_csv(
        'data/exported_csv/email_service_providers.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    email_service_providers = EmailServiceProvider.get_all()
    for email_service_provider in email_service_providers:
        email_service_provider.id_organization = 1

    logger.info('+ Done creating email_service_providers!')

    return res


def seed_domains(row_commit):
    logger.info('- Creating domains..')

    column_index = {
        'name': 1,
        'is_https_enabled': (2, bool),
        'is_redirected_to_main_domain': (3, bool),

        'is_spf_set_up': (4, bool),
        'is_dkim_set_up': (5, bool),
        'is_dmarc_set_up': (6, bool),
        'is_mx_set_up': (7, bool),
        'is_mta_sts_dns_set_up': (8, bool),

        'bought_on': (9, lambda x: x if x else None),
        'id_google_workspace_account': (10, int),
    }
    res = Domain.load_from_csv(
        'data/exported_csv/domains.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    domains = Domain.get_all()
    for domain in domains:
        domain.id_organization = 1

    logger.info('+ Done creating domains!')

    return res


def seed_domain_scores(row_commit):
    logger.info('- Creating domain_scores..')

    column_index = {
        'id_domain': (1, int),
        'id_domain_score_service': (2, int),

        'score': (3, float),
        'score_date': 4,
    }
    res = DomainScore.load_from_csv(
        'data/exported_csv/domain_scores.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    domain_scores = DomainScore.get_all()
    for domain_score in domain_scores:
        domain_score.id_organization = 1

    logger.info('+ Done creating domain_scores!')

    return res


def seed_domain_score_services(row_commit):
    logger.info('- Creating domain_score_services..')

    column_index = {
        'name': 1,
        'website': 2,
    }
    res = DomainScoreService.load_from_csv(
        'data/exported_csv/domain_score_services.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    domain_score_services = DomainScoreService.get_all()
    for domain_score_service in domain_score_services:
        domain_score_service.id_organization = 1

    logger.info('+ Done creating domain_score_services!')

    return res


def seed_exhibit_apps(row_commit):
    logger.info('- Creating exhibit_apps..')

    column_index = {
        'name': 1,
        'url_template': 2,
        'status': 3,
    }
    res = ExhibitApp.load_from_csv(
        'data/exported_csv/exhibit_apps.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    exhibit_apps = ExhibitApp.get_all()
    for exhibit_app in exhibit_apps:
        exhibit_app.id_organization = 1

    logger.info('+ Done creating exhibit_apps!')

    return res


def seed_field_types(row_commit):
    logger.info('- Creating field Types..')

    column_index = {
        'name': 1,
        'description': 2,
        'type_': 3,

        'is_required': (4, bool),
        'options': (5, get_json_from_string),
        'id_field_group': (6, int),
    }
    res = FieldType.load_from_csv(
        'data/exported_csv/fields.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    field_types = FieldType.get_all()
    for field_type in field_types:
        field_type.id_organization = 1

    logger.info('+ Done creating fields!')

    return res


def seed_field_groups(row_commit):
    logger.info('- Creating field_groups..')

    column_index = {
        'name': 1,
        'description': 2,
        # 'object_': 3,
        'id_object_type': (4, int),
    }
    res = FieldGroup.load_from_csv(
        'data/exported_csv/field_groups.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    field_groups = FieldGroup.get_all()
    for field_group in field_groups:
        field_group.id_organization = 1

    logger.info('+ Done creating field_groups!')

    return res

def seed_object_types(row_commit):
    logger.info('- Creating object types..')

    column_index = {
        'name': 1,
        'model_name': 2,
    }
    res = ObjectType.load_from_csv(
        'data/exported_csv/object_types.csv',
        column_index,
        empty_check_col=1,
        repr_col=1,
        row_commit=row_commit,
    )
    logger.info('+ Done creating object types!')

    return res


def drop_tables():
    db.drop_all()


def create_tables():
    db.create_all()


def seed(row_commit, APP_ENV='local'):
    """
    This function is called to populate all the tables with the default
    values.
    """

    logger.info('Seeding tables..')

    seed_countries(row_commit)
    seed_level_1_sub_divisions(row_commit)
    seed_level_2_sub_divisions(row_commit)
    seed_cities(row_commit)
    seed_permissions(row_commit)
    seed_industries(row_commit)
    seed_specializations(row_commit)
    seed_designations(row_commit)

    seed_timezones(row_commit)

    seed_roles(row_commit)
    seed_users(row_commit)
    seed_exhibit_apps(row_commit)
    seed_object_types(row_commit)
    seed_field_groups(row_commit)
    seed_field_types(row_commit)
    seed_company_types(row_commit)
    seed_google_workspace_accounts(row_commit)
    seed_warmup_services(row_commit)
    seed_email_service_providers(row_commit)
    seed_domains(row_commit)
    seed_domain_score_services(row_commit)
    seed_domain_scores(row_commit)
    seed_mail_accounts(row_commit)
    seed_templates(row_commit)
    seed_spintax_variables(row_commit)
    seed_spintax_variants(row_commit)
    seed_campaigns(row_commit)
    seed_campaign_week_day_sessions(row_commit)


    if APP_ENV in ('local', 'dev'):
        seed_dummy_company_and_leads(row_commit)
    elif APP_ENV == 'demo':
        pass
    elif APP_ENV == 'live':
        pass
    else:
        seed_companies(row_commit)
        seed_leads(row_commit)

    logger.info('Done seeding tables!')


def __create_database():
    print('SQLALCHEMY_DATABASE_URI :', SQLALCHEMY_DATABASE_URI)
    if database_exists(SQLALCHEMY_DATABASE_URI):
        logger.info('Dropping database..')
        drop_database(SQLALCHEMY_DATABASE_URI)
    logger.info('Creating a new database..')
    create_database(SQLALCHEMY_DATABASE_URI)


@click.command('rebuild')
@with_appcontext
def rebuild(row_commit=False):
    if row_commit:
        logger.info('Row committing is enabled.')
    else:
        logger.info('Row committing is disabled.')

    _export_csvs_from_spreadsheets()
    __create_database()
    logger.info('Creating tables..')
    create_tables()
    logger.debug('Done Creating tables!')
    seed(row_commit, APP_ENV=APP_ENV)

    # Commit at the end
    if not row_commit:
        logger.debug('Commiting..')
        db.session.commit()

    logger.info('Done!')


@click.command('build-new')
@with_appcontext
def build_new():
    # db.create_all(
    #     bind='__all__',
    #     tables=[
    #         Step.__table__,
    #         LeadStep.__table__,
    #         InstantlyCampaign.__table__,
    #     ],
    # )
    Step.__table__.create(db.session.bind, checkfirst=True)
    LeadBridgeStep.__table__.create(db.session.bind, checkfirst=True)
    InstantlyCampaign.__table__.create(db.session.bind, checkfirst=True)

    ApolloLeadFetchAttempt.__table__.create(db.session.bind, checkfirst=True)
    ApolloEmailFetchAttempt.__table__.create(db.session.bind, checkfirst=True)
    NeverbounceValidationAttempt.__table__.create(db.session.bind, checkfirst=True)
    ScrubbyValidationAttempt.__table__.create(db.session.bind, checkfirst=True)
    InstantlyPushAttempt.__table__.create(db.session.bind, checkfirst=True)
    FailedReason.__table__.create(db.session.bind, checkfirst=True)

    # Re-create step entries
    db.session.query(Step).delete()
    steps = [
        {
            'token': 'no_emails',
            'name': 'No emails',
            'description': 'Leads that got into the system from Apollo for example',
            'order': 1,
            'auto_promote': True,
            'auto_promote_on_external_statuses': None,
        },
        {
            'token': 'fetching_emails_from_apollo',
            'name': 'Fetching emails from Apollo',
            'description': 'Emails are being fetched for these leads from Apollo',
            'order': 2,
            'auto_promote': True,
            'auto_promote_on_external_statuses': None,
        },
        {
            'token': 'verifying_emails_using_neverbounce',
            'name': 'Verifying emails using Neverbounce',
            'description': 'Emails are being verified by Neverbounce',
            'order': 3,
            'auto_promote': True,
            'auto_promote_on_external_statuses': ['verified', 'unknown'],
        },
        {
            'token': 'verifying_emails_using_scrubby',
            'name': 'Verifying emails using Scrubby',
            'description': 'Unverified emails are being verified by Scrubby',
            'order': 4,
            'auto_promote': True,
            'auto_promote_on_external_statuses': None,
        },
        {
            'token': 'pending_enrichment',
            'name': 'Pending enrich',
            'description': 'Lead enrichment happens on this step',
            'order': 5,
            'auto_promote': False,
            'auto_promote_on_external_statuses': None,
        },
        {
            'token': 'pending_manual_verification',
            'name': 'Pending manual verification',
            'description': 'Leads that got into the system from Apollo for example',
            'order': 6,
            'auto_promote': False,
            'auto_promote_on_external_statuses': None,
        },
        {
            'token': 'pushing_to_instantly',
            'name': 'Pushing to Instantly',
            'description': 'Leads are being pushed into an Instantly campaign',
            'order': 7,
            'auto_promote': True,
            'auto_promote_on_external_statuses': None,      # TODO
        },
        {
            'token': 'pushed_to_instantly',
            'name': 'Pushed to Instantly',
            'description': 'Leads that are pushed to Instantly',
            'order': 8,
            'auto_promote': False,
            'auto_promote_on_external_statuses': None,
        },
    ]
    for item in steps:
        step = Step(item)
        db.session.add(step)

    # Re-create failed reason entries
    db.session.query(FailedReason).delete()
    failed_reasons = [
        {
            'name': 'Unknown Industry',
            'description': 'Lead belongs to an unknown industry',
        },
    ]
    for item in failed_reasons:
        failed_reason = FailedReason(item)
        db.session.add(failed_reason)


    # Re-create industry entries
    # db.session.query(Industry).delete()
    # industries = [
    #     {
    #         'name': 'HVAC',
    #         'lowercase_for_template': 'HVAC',
    #     },
    #     {
    #         'name': 'Insurance',
    #         'lowercase_for_template': 'insurance',
    #     },
    #     {
    #         'name': 'Vertical Farming',
    #         'lowercase_for_template': 'vertical farming',
    #     },
    #     {
    #         'name': 'Solar',
    #         'lowercase_for_template': 'solar',
    #     },
    # ]
    # for item in industries:
    #     industry = Industry(item)
    #     db.session.add(industry)


    db.session.commit()

    logger.info('Done adding new tables!')


@click.command('build-newsletter-related')
@with_appcontext
def build_newsletter_related():
    EmailNewsletter.__table__.create(db.session.bind, checkfirst=True)
    EmailSubscriber.__table__.create(db.session.bind, checkfirst=True)

    # Re-create email newsletter entries
    db.session.query(EmailNewsletter).delete()
    newsletters = [
        {
            'token': 'software_development',
            'name': 'Software Development',
            'description': 'Emails to get software development clients',
        },
    ]
    for item in newsletters:
        newsletter = EmailNewsletter(item)
        db.session.add(newsletter)

    db.session.commit()

    logger.info('Done adding new newsletter related tables!')


@click.command('permissions-rebuild')
@with_appcontext
def rebuild_permissions():
    logger.info('Exporting CSV..')
    _export_csvs_from_spreadsheets()

    logger.info('Dropping permissions table..')
    Permission.__table__.drop(db.engine)
    logger.info('Creating permissions tables..')
    Permission.__table__.create(db.engine)
    seed_permissions(row_commit=False)

    db.session.commit()

    logger.info('Done!')


# This function is called by pytest before running tests
def rebuild_test(row_commit=False):
    if row_commit:
        logger.info('Row committing is enabled.')
    else:
        logger.info('Row committing is disabled.')

    _export_csvs_from_spreadsheets()
    logger.info('Dropping any existing tables..')
    drop_tables()
    logger.info('Creating tables..')
    create_tables()
    logger.debug('Done Creating tables!')
    seed(row_commit)

    # Commit at the end
    if not row_commit:
        logger.debug('Commiting..')
        db.session.commit()

    logger.info('Done!')


