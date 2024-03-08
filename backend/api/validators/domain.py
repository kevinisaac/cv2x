from voluptuous import (
    All,
    Any,
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

create_domain_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=4, max=40)),
        Optional('bought_on'): All(ValidDate()),

        Optional('is_https_enabled'): All(bool),
        Optional('is_redirected_to_main_domain'): All(bool),
        Optional('is_spf_set_up'): All(bool),
        Optional('is_dkim_set_up'): All(bool),
        Optional('is_dmarc_set_up'): All(bool),
        Optional('is_mx_set_up'): All(bool),
        Optional('is_mta_sts_dns_set_up'): All(bool),
    }
})

update_domain_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=4, max=40)),
        Optional('bought_on'): All(ValidDate()),

        Optional('is_https_enabled'): All(bool),
        Optional('is_redirected_to_main_domain'): All(bool),
        Optional('is_spf_set_up'): All(bool),
        Optional('is_dkim_set_up'): All(bool),
        Optional('is_dmarc_set_up'): All(bool),
        Optional('is_mx_set_up'): All(bool),
        Optional('is_mta_sts_dns_set_up'): All(bool),
    }
})

