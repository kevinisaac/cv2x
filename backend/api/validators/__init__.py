from voluptuous import (
    Length,
    Range,
)


# Length validations for string datatype
time_length = Length(min=3, max=10)
date_length = Length(min=8, max=10)
datetime_length = Length(min=8, max=50)
email_length = Length(min=9, max=50)
password_length = Length(min=6, max=50)
phone_length = Length(min=5, max=15)
string_length_of_upto_20_characters = Length(min=1, max=20)
string_length_of_upto_50_characters = Length(min=1, max=50)
string_length_from_zero_upto_50_characters = Length(min=0, max=50)
string_length_of_upto_100_characters = Length(min=1, max=100)
string_length_of_upto_1000_characters = Length(min=0, max=1000)


# Range validations for int datatype
maximum_year_range = Range(min=1950, max=9999)
weekday_range = Range(min=0, max=6)
valid_foreign_key = Range(min=1)
value_greater_than_zero = Range(min=1)



# To make full import easier on the actions later
from .mail_account import (
    create_mail_account_schema,
    update_mail_account_schema,
)
from .exhibit_apps import (
    create_exhibit_app_schema,
    update_exhibit_app_schema,
)
from .template import (
    create_template_schema,
    update_template_schema,
)
from .spintax_variable import (
    create_spintax_variable_schema,
    update_spintax_variable_schema,
)
from .email_service_provider import (
    create_email_service_provider_schema,
    update_email_service_provider_schema,
)
from .domain import (
    create_domain_schema,
    update_domain_schema,
)
from .domain_score_service import (
    create_domain_score_service_schema,
    update_domain_score_service_schema,
)
from .domain_score import (
    create_domain_score_schema,
    update_domain_score_schema,
)
from .warmup_service import (
    create_warmup_service_schema,
    update_warmup_service_schema,
)
from .campaign import (
    create_campaign_schema,
    update_campaign_schema,
    end_campaign_schema,
    add_leads_to_campaign_schema,
    remove_leads_from_campaign_schema,
)
from .lead import (
    create_lead_schema,
    update_lead_schema,
    send_email_to_lead_schema,
)
from .email_newsletter import (
    create_email_newsletter_schema,
    update_email_newsletter_schema,
)
from .email_subscriber import (
    create_email_subscriber_schema,
    update_email_subscriber_schema,
)

