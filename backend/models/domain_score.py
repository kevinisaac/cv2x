import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class DomainScore(BaseModel):
    __tablename__ = 'domain_scores'

    score = db.Column(db.Numeric)                       # 0 - 10
    score_date = db.Column(db.DateTime)

    id_domain = db.Column(
        db.Integer, db.ForeignKey('domains.id', name='fk_domains'),
    )
    id_domain_score_service = db.Column(
        db.Integer, db.ForeignKey('domain_score_services.id', name='fk_domain_score_services')
    )

    readable_fields = [
        'score',
        'score_date',
    ]

