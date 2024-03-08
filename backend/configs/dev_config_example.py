SQLALCHEMY_DATABASE_URI = f'postgresql://postgres_username:postgres_password@localhost/database_name'

MAILGUN = {
    'SENDER':'Sender Name',
    'URL': 'https://api.mailgun.net/v3/mailgun.getpreview.io/messages',
    'API_KEY': 'Respective API key from mailgun',
}

SECRET_KEY = 'secret_key_for_the_application'
