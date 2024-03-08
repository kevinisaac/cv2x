import logging
logger = logging.getLogger(__name__)

# Imports from flask
from flask import (
    g,
    request,
    Blueprint,
    current_app,
    current_app as app,
    send_from_directory,
    send_file
)
# Imports from flask JWT
from flask_jwt_extended import jwt_required

# Imports zephony package
from zephony.helpers import (
    add_urls,
    responsify,
    date_format,
    is_valid_date,
    serialize_datetime,
    get_customized_response_message,
)
from zephony.decorators import (
    validate_schema,
    # permission_required,
)
from zephony.exceptions import ResourceNotFound

# Import permission decorators
from ..decorators import permission_required

# Import validators
from .validators.user import (
    login_schema,
    verify_password,
    create_a_user_schema,
    update_a_user_schema,
    set_password_schema,
    reset_password_schema,
    forgot_password_schema,
    update_my_account_schema,
    update_email_or_password,
    confirm_new_email_schema,
    resend_invite_to_user_schema,
)
from .validators.role import (
    create_role_schema,
    update_role_schema,
)
from .validators.industry import (
    create_industry_schema,
    update_industry_schema,
)
from .validators.company import (
    create_company_schema,
    update_company_schema,
)
from .validators.company_type import (
    create_company_type_schema,
    update_company_type_schema,
)
from .validators.specialization import (
    create_specialization_schema,
    update_specialization_schema,
)
from .validators.designation import (
    create_designation_schema,
    update_designation_schema,
)
from .validators.custom_field import (
    create_field_group_schema,
    update_field_group_schema,
    create_field_type_schema,
    update_field_type_schema,
)
from .validators.object_type import (
    create_object_type_schema,
    update_object_type_schema,
)
from .validators.exhibit_apps import (
    create_exhibit_app_schema,
    update_exhibit_app_schema,
    share_my_link_schema,
)
from .validators.step import (
    update_step_schema,
)
from .validators.lead import (
    create_lead_schema,
    update_lead_schema,
    lead_activity_schema,
)

from .validators import *

# Import actions classes
from ..actions import (
    LeadActions,
    DomainActions,
    DomainScoreActions,
    DomainScoreServiceActions,
    PermissionActions,
    RoleActions,
    UserActions,
    AuthActions,
    MyAccountActions,
    IndustryActions,
    CompanyActions,
    CompanyTypeActions,
    CountryActions,
    Level1SubDivisionActions,
    Level2SubDivisionActions,
    CityActions,
    DesignationActions,
    EmailServiceProviderActions,
    TimezoneActions,
    ExhibitAppActions,
    MailAccountActions,
    TemplateActions,
    SpintaxVariableActions,
    WarmupServiceActions,
    FileActions,
    ObjectTypeActions,
    FieldGroupActions,
    FieldTypeActions,
    ExportLeadBasedOnUsernameActions,
    CampaignActions,
    SpecializationActions,
    ExhibitShareLinkActions,
    ExhibitLeadResponseActions,
    FlowActions,
    InstantlyCampaignActions,
    InstantlyActions,
    ScrubbyActions,
    NeverbounceActions,
    StepActions,
    EmailNewsletterActions,
    EmailSubscriberActions,
    CommonActions,
)

from . import api

from ..json_data import json_data


class IndustryR:
    collection_route = '/industries'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    def get(id_):
        return responsify(IndustryActions.get(id_=id_))

    @jwt_required()
    def get_all():
        return responsify(IndustryActions.get_all(params=request.params))

    @jwt_required()
    @validate_schema(create_industry_schema)
    def post():
        return responsify(IndustryActions.create(data=request.payload['data']))

    @jwt_required()
    @validate_schema(update_industry_schema)
    def patch(id_):
        return responsify(
            IndustryActions.update(
                id_=id_,
                data=request.payload['data']
            ),
        )

    @jwt_required()
    def delete(id_):
        return responsify(IndustryActions.delete(id_=id_))


class CompanyR:
    collection_route = '/companies'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    def get(id_):
        return responsify(CompanyActions.get(id_=id_))

    @jwt_required()
    def get_all():
        return responsify(CompanyActions.get_all(params=request.params))

    @jwt_required()
    @validate_schema(create_company_schema)
    def post():
        return responsify(CompanyActions.create(data=request.payload['data']))

    @jwt_required()
    @validate_schema(update_company_schema)
    def patch(id_):
        return responsify(
            CompanyActions.update(
                id_=id_,
                data=request.payload['data']
            ),
        )

    @jwt_required()
    def delete(id_):
        return responsify(CompanyActions.delete(id_=id_))


class UserR():
    collection_route = '/users'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    def get(id_):
        return responsify(UserActions.get(id_=id_))

    @jwt_required()
    def get_all():
        return responsify(UserActions.get_all(params=request.params))

    @jwt_required()
    @validate_schema(create_a_user_schema)
    def post():
        return responsify(UserActions.create(data=request.payload['data']))

    @jwt_required()
    @validate_schema(update_a_user_schema)
    def patch(id_):
        return responsify(
            UserActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )


class MyAccountR():
    """
    Resource to handle request to retrieve the logged in user details.
    """

    resource_route = '/me'

    @jwt_required()
    def get():
        return responsify(MyAccountActions.get(request.user.id_))

    @validate_schema(update_my_account_schema)
    @jwt_required()
    def patch():
        return responsify(
            MyAccountActions.update(
                id_=request.user.id_,
                data=request.payload['data']
            )
        )


class VerifyPasswordR():
    collection_route = '/me/unlock-to-update-account'

    @jwt_required()
    @validate_schema(verify_password)
    def post():
        return responsify(MyAccountActions.validate_password(data=request.payload['data']))


class ChangeEmailOrPasswordR():
    resource_route = '/me/change-email-or-password'

    @jwt_required()
    @validate_schema(update_email_or_password)
    def patch():
        return responsify(MyAccountActions.change_email_or_password(data=request.payload['data']))


class ChangeNewEmailR():
    collection_route = '/confirm-new-email'

    @validate_schema(confirm_new_email_schema)
    def post():
        return responsify(MyAccountActions.confirm_new_email(data=request.payload['data']))


class ForgotPasswordR():
    collection_route = '/forgot-password'

    @validate_schema(forgot_password_schema)
    def post():
        return responsify(AuthActions.send_password_reset_link(data=request.payload['data']))


class ResetPasswordR():
    collection_route = '/reset-password'

    @validate_schema(reset_password_schema)
    def post():
        return responsify(AuthActions.reset_password(data=request.payload['data']))


class SetPasswordR():
    collection_route = '/set-password'

    @validate_schema(set_password_schema)
    def post():
        return responsify(AuthActions.set_password(data=request.payload['data']))


class ResendInviteToSetPasswordR():
    collection_route = '/resend-invite'

    @jwt_required()
    @validate_schema(resend_invite_to_user_schema)
    def post():
        return responsify(AuthActions.resend_invite(data=request.payload['data']))


class LoginWithPasswordR():
    """
    Resource to handle request to login with password.
    """

    collection_route = '/login'

    @validate_schema(login_schema)
    def post():
        return responsify(AuthActions.login_with_password(data=request.payload['data']))


class RoleR():
    collection_route = '/roles'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_role_schema)
    def post():
        return responsify(RoleActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(RoleActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(RoleActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_role_schema)
    def patch(id_):
        return responsify(
            RoleActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(RoleActions.delete(id_=id_))


class PermissionR():
    collection_route = '/permissions'

    @jwt_required()
    def get_all():
        return responsify(
            PermissionActions.get_all(params=request.params)
        )


class LeadR():
    collection_route = '/leads'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_lead_schema)
    def post():
        return responsify(LeadActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(LeadActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(LeadActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_lead_schema)
    def patch(id_):
        return responsify(
            LeadActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(LeadActions.delete(id_=id_))


class LeadExportR():
    collection_route = '/leads/-/export'

    @jwt_required()
    def post():
        return LeadActions.export_leads()


class BulkImportLeadWithCompanyR():
    collection_route = '/leads/file-imports'

    @jwt_required()
    def post():
        files = request.files.getlist('files')

        config = {
            'FILE_UPLOAD_FOLDER': app.config['UPLOAD_FOLDER'],
            'ALLOWED_EXTENSIONS': app.config['FILE_ALLOWED_EXTENSIONS'],
            'MAX_CONTENT_LENGTH': app.config['MAX_CONTENT_LENGTH']
        }
        return responsify(
            LeadActions.bulk_leads_import(
                files=files,
                config=config,
            )
        )

    @jwt_required()
    def get_all():
        return responsify(
            LeadActions.get_lead_imports_details()
        )


class SendEmailToLeadR():
    collection_route = '/leads/<int:id_>/send-email'

    @jwt_required()
    @validate_schema(send_email_to_lead_schema)
    def post(id_):
        return responsify(
            LeadActions.send_email_to_lead(
                id_,
                data=request.payload['data'],
            ),
        )


class CompanyTypeR():
    collection_route = '/company-types'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_company_type_schema)
    def post():
        return responsify(CompanyTypeActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(CompanyTypeActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(CompanyTypeActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_company_type_schema)
    def patch(id_):
        return responsify(
            CompanyTypeActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(CompanyTypeActions.delete(id_=id_))


class SpecializationR():
    collection_route = '/specializations'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_specialization_schema)
    def post():
        return responsify(SpecializationActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(SpecializationActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(SpecializationActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_specialization_schema)
    def patch(id_):
        return responsify(
            SpecializationActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(SpecializationActions.delete(id_=id_))


class CountryR():
    collection_route = '/countries'

    @jwt_required()
    def get_all():
        return responsify(CountryActions.get_all(params=request.params))


class Level1SubDivisionR():
    collection_route = '/level-1-sub-divisions'

    @jwt_required()
    def get_all():
        return responsify(Level1SubDivisionActions.get_all(params=request.params))


class Level2SubDivisionR():
    collection_route = '/level-2-sub-divisions'

    @jwt_required()
    def get_all():
        return responsify(Level2SubDivisionActions.get_all(params=request.params))


class CityR():
    collection_route = '/cities'

    @jwt_required()
    def get_all():
        return responsify(CityActions.get_all(params=request.params))


class DesignationR():
    collection_route = '/designations'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_designation_schema)
    def post():
        return responsify(DesignationActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(DesignationActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(DesignationActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_designation_schema)
    def patch(id_):
        return responsify(
            DesignationActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(DesignationActions.delete(id_=id_))


class CampaignR:
    collection_route = '/campaigns'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(CampaignActions.get(id_=id_))

    def get_all():
        return responsify(CampaignActions.get_all(params=request.params))

    @validate_schema(create_campaign_schema)
    def post():
        campaign_details = CampaignActions.create(data=request.payload['data'])

        return responsify(
            data=campaign_details,
        )

    @validate_schema(update_campaign_schema)
    def patch(id_):
        campaign_details = CampaignActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=campaign_details)

    def delete(id_):
        details = CampaignActions.delete(id_)
        return responsify(data=details)


class CampaignStartR:
    collection_route = '/campaigns/<int:id_>/start'

    def post(id_):
        campaign_details = CampaignActions.start(id_)

        return responsify(
            data=campaign_details,
        )


class CampaignEndR:
    collection_route = '/campaigns/<int:id_>/end'

    @validate_schema(end_campaign_schema)
    def post(id_):
        campaign_details = CampaignActions.end(
            id_,
            data=request.payload['data'],
        )

        return responsify(
            data=campaign_details,
        )


class CampaignAddLeadsR:
    collection_route = '/campaigns/<int:id_>/add-leads'

    @validate_schema(add_leads_to_campaign_schema)
    def post(id_):
        campaign_details = CampaignActions.add_leads(
            id_,
            data=request.payload['data'],
        )

        return responsify(
            data=campaign_details,
        )


class CampaignRemoveLeadsR:
    collection_route = '/campaigns/<int:id_>/remove-leads'

    @validate_schema(remove_leads_from_campaign_schema)
    def post(id_):
        campaign_details = CampaignActions.remove_leads(
            id_,
            data=request.payload['data'],
        )

        return responsify(
            data=campaign_details,
        )


class DomainR:
    collection_route = '/domains'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(DomainActions.get(id_=id_))

    def get_all():
        return responsify(DomainActions.get_all(params=request.params))

    @validate_schema(create_domain_schema)
    def post():
        domain_details = DomainActions.create(data=request.payload['data'])

        return responsify(
            data=domain_details,
        )

    @validate_schema(update_domain_schema)
    def patch(id_):
        domain_details = DomainActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=domain_details)

    def delete(id_):
        details = DomainActions.delete(id_)
        return responsify(data=details)


class DomainScoreR:
    collection_route = '/domain-scores'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(DomainScoreActions.get(id_=id_))

    def get_all():
        return responsify(DomainScoreActions.get_all(params=request.params))

    @validate_schema(create_domain_score_schema)
    def post():
        domain_score_details = DomainScoreActions.create(data=request.payload['data'])

        return responsify(
            data=domain_score_details,
        )

    @validate_schema(update_domain_score_schema)
    def patch(id_):
        domain_score_details = DomainScoreActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=domain_score_details)

    def delete(id_):
        details = DomainScoreActions.delete(id_)
        return responsify(data=details)


class DomainScoreServiceR:
    collection_route = '/domain-score-services'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(DomainScoreServiceActions.get(id_=id_))

    def get_all():
        return responsify(DomainScoreServiceActions.get_all(params=request.params))

    @validate_schema(create_domain_score_service_schema)
    def post():
        domain_score_service_details = DomainScoreServiceActions.create(
            data=request.payload['data'],
        )

        return responsify(
            data=domain_score_service_details,
        )

    @validate_schema(update_domain_score_service_schema)
    def patch(id_):
        domain_score_service_details = DomainScoreServiceActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=domain_score_service_details)

    def delete(id_):
        details = DomainScoreServiceActions.delete(id_)
        return responsify(data=details)


class WarmupServiceR:
    collection_route = '/warmup-services'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(WarmupServiceActions.get(id_=id_))

    def get_all():
        return responsify(WarmupServiceActions.get_all(params=request.params))

    @validate_schema(create_warmup_service_schema)
    def post():
        warmup_service_details = WarmupServiceActions.create(
            data=request.payload['data'],
        )

        return responsify(
            data=warmup_service_details,
        )

    @validate_schema(update_warmup_service_schema)
    def patch(id_):
        warmup_service_details = WarmupServiceActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=warmup_service_details)

    def delete(id_):
        details = WarmupServiceActions.delete(id_)
        return responsify(data=details)


class EmailServiceProviderR:
    collection_route = '/email-service-providers'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(EmailServiceProviderActions.get(id_=id_))

    def get_all():
        return responsify(EmailServiceProviderActions.get_all(params=request.params))

    @validate_schema(create_email_service_provider_schema)
    def post():
        email_service_provider_details = EmailServiceProviderActions.create(
            data=request.payload['data'],
        )

        return responsify(
            data=email_service_provider_details,
        )

    @validate_schema(update_email_service_provider_schema)
    def patch(id_):
        email_service_provider_details = EmailServiceProviderActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=email_service_provider_details)

    def delete(id_):
        details = EmailServiceProviderActions.delete(id_)
        return responsify(data=details)


class TimezoneR:
    collection_route = '/timezones'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(TimezoneActions.get(id_=id_))

    def get_all():
        return responsify(TimezoneActions.get_all(params=request.params))

    def post():
        timezone_details = TimezoneActions.create(data=request.payload['data'])

        return responsify(
            data=timezone_details,
        )

    def patch(id_):
        timezone_details = TimezoneActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=timezone_details)

    def delete(id_):
        details = TimezoneActions.delete(id_)
        return responsify(data=details)


class ExhibitAppR:
    collection_route = '/exhibit-apps'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(ExhibitAppActions.get(id_=id_))

    def get_all():
        return responsify(ExhibitAppActions.get_all(params=request.params))

    @validate_schema(create_exhibit_app_schema)
    def post():
        exhibit_app_details = ExhibitAppActions.create(data=request.payload['data'])

        return responsify(
            data=exhibit_app_details,
        )

    @validate_schema(update_exhibit_app_schema)
    def patch(id_):
        exhibit_app_details = ExhibitAppActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=exhibit_app_details)

    def delete(id_):
        details = ExhibitAppActions.delete(id_)
        return responsify(data=details)


class MailAccountR:
    collection_route = '/mail-accounts'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(MailAccountActions.get(id_=id_))

    def get_all():
        return responsify(MailAccountActions.get_all(params=request.params))

    @validate_schema(create_mail_account_schema)
    def post():
        mail_account_details = MailAccountActions.create(
            data=request.payload['data'],
        )

        return responsify(
            data=mail_account_details,
        )

    @validate_schema(update_mail_account_schema)
    def patch(id_):
        mail_account_details = MailAccountActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=mail_account_details)

    def delete(id_):
        details = MailAccountActions.delete(id_)
        return responsify(data=details)


class TemplateR:
    collection_route = '/templates'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(TemplateActions.get(id_=id_))

    def get_all():
        return responsify(TemplateActions.get_all(params=request.params))

    @validate_schema(create_template_schema)
    def post():
        template_details = TemplateActions.create(data=request.payload['data'])

        return responsify(
            data=template_details,
        )

    @validate_schema(update_template_schema)
    def patch(id_):
        template_details = TemplateActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=template_details)

    def delete(id_):
        details = TemplateActions.delete(id_)
        return responsify(data=details)


class StepR:
    collection_route = '/steps'
    resource_route = f'{collection_route}/<int:id_>'

    def get_all():
        return responsify(StepActions.get_all(params=request.params))

    @validate_schema(update_step_schema)
    def patch(id_):
        step_details = StepActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=step_details)


class SpintaxVariableR:
    collection_route = '/spintax-variables'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(SpintaxVariableActions.get(id_=id_))

    def get_all():
        return responsify(SpintaxVariableActions.get_all(params=request.params))

    @validate_schema(create_spintax_variable_schema)
    def post():
        spintax_variable_details = SpintaxVariableActions.create(data=request.payload['data'])

        return responsify(
            data=spintax_variable_details,
        )

    @validate_schema(update_spintax_variable_schema)
    def patch(id_):
        spintax_variable_details = SpintaxVariableActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=spintax_variable_details)

    def delete(id_):
        details = SpintaxVariableActions.delete(id_)
        return responsify(data=details)


class FilesUploadR():
    """
    This is a generic endpoint to upload any kind of file. Multiple files can
    be uploaded in a single request. Once uploaded, the file URLs will be
    returned in a list, those URLs can be used in a database field, for
    instance.
    """

    collection_route = '/files'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    def post():
        files = request.files.getlist('files')
        custom_file_name = request.args.get('custom_file_name', None)

        config = {
            'FILE_UPLOAD_FOLDER': app.config['UPLOAD_FOLDER'],
            'ALLOWED_EXTENSIONS': app.config['IMAGE_ALLOWED_EXTENSIONS'],
            'MAX_CONTENT_LENGTH': app.config['MAX_CONTENT_LENGTH']
        }

        return responsify(
            FileActions.create(
                files=files,
                config=config,
                custom_file_name=custom_file_name,
            )
        )

    @jwt_required()
    def get(id_):
        """
        Get the details of a file.
        """

        return responsify(FileActions.get(id_))


class ObjectTypeR():
    collection_route = '/object-types'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_object_type_schema)
    def post():
        return responsify(ObjectTypeActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(ObjectTypeActions.get_all())

    @jwt_required()
    def get(id_):
        return responsify(ObjectTypeActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_object_type_schema)
    def patch(id_):
        return responsify(
            ObjectTypeActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(ObjectTypeActions.delete(id_=id_))


class FieldGroupR():
    collection_route = '/field-groups'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_field_group_schema)
    def post():
        return responsify(FieldGroupActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(FieldGroupActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(FieldGroupActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_field_group_schema)
    def patch(id_):
        return responsify(
            FieldGroupActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(FieldGroupActions.delete(id_=id_))


class FieldTypeR():
    collection_route = '/field-types'
    resource_route = f'{collection_route}/<int:id_>'

    @jwt_required()
    @validate_schema(create_field_type_schema)
    def post():
        return responsify(FieldTypeActions.create(data=request.payload['data']))

    @jwt_required()
    def get_all():
        return responsify(FieldTypeActions.get_all(params=request.params))

    @jwt_required()
    def get(id_):
        return responsify(FieldTypeActions.get(id_=id_))

    @jwt_required()
    @validate_schema(update_field_type_schema)
    def patch(id_):
        return responsify(
            FieldTypeActions.update(
                id_=id_,
                data=request.payload['data']
            )
        )

    @jwt_required()
    def delete(id_):
        return responsify(FieldTypeActions.delete(id_=id_))


class ExportLeadBasedOnUsernameR():
    collection_route = '/accounts/<username>'
    resource_route = f'{collection_route}'

    def get(username):
        return responsify(ExportLeadBasedOnUsernameActions.get(username=username))


class UnsubscribeLinkR():
    collection_route = '/unsubscribe/<unsubscribe_token>'

    def post(unsubscribe_token):
        return responsify(
            LeadActions.unsubscribe(unsubscribe_token=unsubscribe_token)
        )


# TODO: Temporary route
class CampaignScheduleR:
    collection_route = '/campaigns/<int:id_>/schedule'

    def post(id_):
        campaign_details = CampaignActions.schedule(
            id_,
        )

        return responsify(
            data=campaign_details,
        )


class ExhibitShareLinkR:
    collection_route = '/accounts/me/share-links'

    def post():
        return responsify(
            ExhibitShareLinkActions.share_my_link(
                data=request.payload['data']
            )
        )


class LeadResponseR:
    collection_route = '/accounts/<username>/activities'
    # collection_route = '/accounts/kevinisaac01/activites'

    @validate_schema(lead_activity_schema)
    def post(username):
        ic(username)
        return responsify(
            ExhibitLeadResponseActions.lead_activities(
                username=username,
                data=request.payload['data'],
            )
        )

# class ValidateEmailR:
#     collection_route = '/email/validate'

#     def post():
#         return responsify(
#             CommonActions.integrate_never_bounce_for_email_validation()
#         )


class FetchLeadsFromApolloR():
    collection_route = '/fetch-leads-from-apollo'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        ic(request.payload)
        return responsify(FlowActions.store_leads_from_apollo(data=request.payload['data']))


class FetchEmailsFromApolloR():
    collection_route = '/fetch-emails-from-apollo'

    # @jwt_required()
    # @validate_schema(fetch_emails_from_apollo_schema)
    def post():
        return responsify(FlowActions.store_emails_from_apollo())


class InstantlyCampaignR:
    collection_route = '/instantly-campaigns'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(InstantlyCampaignActions.get(id_=id_))

    def get_all():
        return responsify(InstantlyCampaignActions.get_all(params=request.params))

    # @validate_schema(update_template_schema)
    def patch(id_):
        template_details = InstantlyCampaignActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=template_details)

    def delete(id_):
        details = InstantlyCampaignActions.delete(id_)
        return responsify(data=details)



class SyncCampaignsFromInstantlyR():
    collection_route = '/sync-campaigns-from-instantly'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(InstantlyActions.sync_campaigns_from_instantly())


class SyncCampaignSummaryFromInstantlyR():
    collection_route = '/sync-campaign-summary-from-instantly'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(
            InstantlyActions.sync_campaign_summary_from_instantly(
                request.payload['data']
            )
        )


class MoveLeadToVerificationStepR():
    collection_route = '/move-lead-to-verification-step'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(
            FlowActions.move_lead_to_verification_step(
                request.payload['data']
            )
        )


class MoveLeadToInstantlyStepR():
    collection_route = '/move-lead-to-instantly-step'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(
            FlowActions.move_lead_to_instantly_step(
                request.payload['data']
            )
        )


class SubmitEmailsToNeverbounceR():
    collection_route = '/submit-emails-to-neverbounce'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(NeverbounceActions.submit_emails_to_neverbounce())


# TODO
class CheckEmailsSubmittedToNeverbounceR():
    collection_route = '/check-emails-submitted-to-neverbounce'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(NeverbounceActions.check_emails_submitted_to_neverbounce(
            data=request.payload['data']
        ))


# TODO
class FetchEmailStatusesFromNeverbounceR():
    collection_route = '/fetch-email-statuses-from-neverbounce'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(NeverbounceActions.fetch_email_statuses_from_neverbounce(
            data=request.payload['data']
        ))


class CheckAndFetchAllNeverbounceJobsR():
    collection_route = '/check-and-fetch-all-neverbounce-jobs'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(NeverbounceActions.check_and_fetch_all_neverbounce_jobs())


class SubmitEmailsToScrubbyR():
    collection_route = '/submit-emails-to-scrubby'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(ScrubbyActions.submit_emails_to_scrubby())


class FetchEmailStatusesFromScrubbyR():
    collection_route = '/fetch-email-statuses-from-scrubby'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(ScrubbyActions.fetch_email_statuses_from_scrubby())


class PushLeadsToInstantlyCampaignsR():
    collection_route = '/push-leads-to-instantly-campaigns'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(InstantlyActions.push_leads_to_instantly_campaigns())


class DumpLeadsR():
    collection_route = '/dump-leads'

    # @jwt_required()
    # @validate_schema(fetch_leads_from_apollo_schema)
    def post():
        return responsify(FlowActions.dump_leads(data=request.payload['data']))


class EmailNewsletterR:
    collection_route = '/email-newsletters'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(EmailNewsletterActions.get(id_=id_))

    def get_all():
        return responsify(EmailNewsletterActions.get_all(params=request.params))

    @validate_schema(create_email_newsletter_schema)
    def post():
        newsletter_details = EmailNewsletterActions.create(
            data=request.payload['data'],
        )
        return responsify(data=newsletter_details)

    @validate_schema(update_email_newsletter_schema)
    def patch(id_):
        newsletter_details = EmailNewsletterActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=newsletter_details)


class EmailSubscriberR:
    collection_route = '/email-subscribers'
    resource_route = f'{collection_route}/<int:id_>'

    def get(id_):
        return responsify(EmailSubscriberActions.get(id_=id_))

    def get_all():
        return responsify(EmailSubscriberActions.get_all(params=request.params))

    @validate_schema(create_email_subscriber_schema)
    def post():
        subscriber_details = EmailSubscriberActions.create(
            data=request.payload['data'],
        )
        return responsify(data=subscriber_details)

    @validate_schema(update_email_subscriber_schema)
    def patch(id_):
        subscriber_details = EmailSubscriberActions.update(
            id_=id_,
            data=request.payload['data'],
        )
        return responsify(data=subscriber_details)




add_urls(api, [
    FilesUploadR,
    PermissionR,
    RoleR,
    UserR,
    LoginWithPasswordR,
    MyAccountR,
    VerifyPasswordR,
    ChangeEmailOrPasswordR,
    ChangeNewEmailR,
    ForgotPasswordR,
    ResetPasswordR,
    SetPasswordR,
    ResendInviteToSetPasswordR,
    IndustryR,
    CompanyR,
    LeadR,
    LeadExportR,
    DomainR,
    DomainScoreR,
    DomainScoreServiceR,
    CompanyTypeR,
    CountryR,
    Level1SubDivisionR,
    Level2SubDivisionR,
    CityR,
    DesignationR,
    EmailServiceProviderR,
    TimezoneR,
    ExhibitAppR,
    MailAccountR,
    TemplateR,
    SpintaxVariableR,
    WarmupServiceR,
    SpecializationR,
    ObjectTypeR,
    FieldGroupR,
    FieldTypeR,
    ExportLeadBasedOnUsernameR,

    CampaignR,
    CampaignStartR,
    CampaignEndR,
    UnsubscribeLinkR,
    SendEmailToLeadR,
    CampaignAddLeadsR,
    CampaignRemoveLeadsR,
    CampaignScheduleR,
    ExhibitShareLinkR,
    BulkImportLeadWithCompanyR,
    # ValidateEmailR,
    LeadResponseR,

    FetchLeadsFromApolloR,
    FetchEmailsFromApolloR,
    SyncCampaignsFromInstantlyR,
    SyncCampaignSummaryFromInstantlyR,
    SubmitEmailsToNeverbounceR,
    CheckEmailsSubmittedToNeverbounceR,
    FetchEmailStatusesFromNeverbounceR,
    CheckAndFetchAllNeverbounceJobsR,
    SubmitEmailsToScrubbyR,
    FetchEmailStatusesFromScrubbyR,
    PushLeadsToInstantlyCampaignsR,
    InstantlyCampaignR,

    MoveLeadToVerificationStepR,
    MoveLeadToInstantlyStepR,
    DumpLeadsR,
    StepR,

    EmailNewsletterR,
    EmailSubscriberR,
])

