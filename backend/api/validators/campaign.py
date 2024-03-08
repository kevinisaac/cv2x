from voluptuous import (
    All,
    Any,
    Range,
    Length,
    Schema,
    Optional,
    Required,
)

from zephony.validators import (
    AllowedPassword,
    ValidEmail,
    ValidDate,
    OnlyDigits,
    ValidString,
    ValidTime,
)



MONDAY = 0
SUNDAY = 6

# Used by create and update schemas respectively
create_campaign_schema = Schema({
    Required('data'): {
        Required('name'): All(str, Length(min=1, max=100)),
        Optional('notes'): All(str, Length(min=0, max=10000)),
        Optional('id_exhibit_app'): All(int, Range(min=1)),
        Optional('ids_template'): [ All(int, Range(min=1)) ],
        Optional('mail_accounts'): [
            {
                Required('id_'): All(int, Range(min=1)),
                Required('maximum_emails_per_day'): All(int, Range(min=0, max=50)),
            },
        ],
        Optional('sessions'): [
            {
                Required('weekday'): All(int, Range(min=MONDAY, max=SUNDAY)),
                Required('timings'): [
                    {
                        Required('end_time'): ValidTime(),
                        Required('start_time'): ValidTime(),
                    }
                ],
            }
        ],
    }
})

update_campaign_schema = Schema({
    Required('data'): {
        Optional('name'): All(str, Length(min=1, max=100)),
        Optional('notes'): All(str, Length(min=0, max=10000)),
        Optional('accepts_leads'): All(bool),
        Optional('id_exhibit_app'): All(int, Range(min=1)),
        Optional('ids_template'): [ All(int, Range(min=1)) ],
        Optional('mail_accounts'): [
            {
                Required('id_'): All(int, Range(min=1)),
                Required('maximum_emails_per_day'): All(int, Range(min=0, max=50)),
            },
        ],
        Optional('sessions'): [
            {
                Required('weekday'): All(int, Range(min=MONDAY, max=SUNDAY)),
                Required('timings'): [
                    {
                        Required('end_time'): ValidTime(),
                        Required('start_time'): ValidTime(),
                        Optional('id_campaign_week_day_session'): All(int, Range(min=1)),
                        Optional('is_deleted'): bool,
                    }
                ],
            }
        ],
    }
})

end_campaign_schema = Schema({
    Required('data'): {
        Required('end_type'): Any('graceful', 'abrupt'),
    }
})

add_leads_to_campaign_schema = Schema({
    Required('data'): {
        Required('ids_lead'): [ All(int, Range(min=1)) ],
    }
})

remove_leads_from_campaign_schema = Schema({
    Required('data'): {
        Required('ids_lead'): [ All(int, Range(min=1)) ],
    }
})

