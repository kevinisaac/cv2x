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

create_exhibit_app_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=5, max=50)),
        Required('url_template'): All(ValidString(), Length(min=5, max=50)),
        Required('status'): Any('active', 'inactive'),
    }
})

update_exhibit_app_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=5, max=50)),
        Optional('url_template'): All(ValidString(), Length(min=5, max=50)),
        Optional('status'): Any('active', 'inactive'),
    }
})

share_my_link_schema = Schema({
    Required('data'): {
        Required('emails'): All([ValidEmail()])
    }
})