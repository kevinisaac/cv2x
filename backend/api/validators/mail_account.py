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
)

create_mail_account_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail()),
        Optional('api_key'): All(ValidString(), Length(min=0, max=300)),

        Required('is_mailbox_created'): All(bool),
        Optional('primary_email'): All(ValidEmail()),
        Optional('warmup_started_on'): All(ValidDate()),
        Optional('notes'): All(ValidString(), Length(min=0, max=10000)),
        Optional('warmup_service_account'): All(ValidEmail()),

        Optional('id_warmup_service'): All(int, Range(min=1)),
        Optional('id_domain'): All(int, Range(min=1)),
        Optional('id_email_service_provider'): All(int, Range(min=1)),
    }
})

update_mail_account_schema = Schema({
    Required('data'): {
        Optional('email'): All(ValidEmail()),
        Optional('api_key'): All(ValidString(), Length(min=0, max=300)),

        Optional('is_mailbox_created'): All(bool),
        Optional('primary_email'): All(ValidEmail()),
        Optional('warmup_started_on'): All(ValidDate()),
        Optional('notes'): All(ValidString(), Length(min=0, max=10000)),
        Optional('warmup_service_account'): All(ValidEmail()),

        Optional('id_warmup_service'): All(int, Range(min=1)),
        Optional('id_domain'): All(int, Range(min=1)),
        Optional('id_email_service_provider'): All(int, Range(min=1)),
    }
})

