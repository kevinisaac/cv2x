import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class CompanyBridgeSpecialization(BaseModel):
    __tablename__ = 'companies_bridge_specializations'

    id_company = db.Column(
        db.Integer,
        db.ForeignKey('companies.id', name='fk_companies'),
    )
    id_specialization = db.Column(
        db.Integer,
        db.ForeignKey('specializations.id', name='fk_specializations'),
    )

