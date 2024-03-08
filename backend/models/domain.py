import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Domain(BaseModel):
    __tablename__ = 'domains'

    name = db.Column(db.String)
    is_https_enabled = db.Column(db.Boolean)
    is_redirected_to_main_domain = db.Column(db.Boolean)

    is_spf_set_up = db.Column(db.Boolean)
    is_dkim_set_up = db.Column(db.Boolean)
    is_dmarc_set_up = db.Column(db.Boolean)
    is_mx_set_up = db.Column(db.Boolean)
    is_mta_sts_dns_set_up = db.Column(db.Boolean)

    bought_on = db.Column(db.Date)

    id_google_workspace_account = db.Column(
        db.Integer,
        db.ForeignKey('google_workspace_accounts.id', name='fk_google_workspace_accounts'),
    )

    readable_fields = [
        'name',
        'is_https_enabled',
        'is_redirected_to_main_domain',

        'is_spf_set_up',
        'is_dkim_set_up',
        'is_dmarc_set_up',
        'is_mx_set_up',
        'is_mta_sts_dns_set_up',

        'bought_on',
    ]

