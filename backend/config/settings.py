"""
Django settings. Everything environment-specific comes from environment
variables (see .env.example) so the same code runs locally, in Docker and on
DigitalOcean. One instance of this app == one school.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Load a .env file if present (keeps local dev simple without extra packages).
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-insecure-key")
DEBUG = os.environ.get("DEBUG", "1") == "1"
ALLOWED_HOSTS = [h for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "corsheaders",
    # our modules (one app per feature, added as we build them)
    "apps.core",
    "apps.students",
    "apps.academics",
    "apps.assessments",
    "apps.attendance",
    "apps.fees",
    "apps.events",
    "apps.communication",
    "apps.admissions",
    "apps.notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database: Postgres when DB_HOST is set, otherwise a local SQLite file.
if os.environ.get("DB_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "school"),
            "USER": os.environ.get("DB_USER", "school"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "school"),
            "HOST": os.environ["DB_HOST"],
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Our own User model (has a `role` field). Must be set before the first migration.
AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("TIME_ZONE", "Africa/Harare")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- API ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    # Every error leaves the API in the same shape (see apps/core/exceptions.py).
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    # Named speed limits. A view opts in with throttle_scope = "forgot_password".
    "DEFAULT_THROTTLE_RATES": {"forgot_password": "5/hour", "reset_password": "10/hour"},
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Each login token carries a fingerprint of the password it was issued under. Change the
    # password and every older token stops working, so a reset really does lock a stolen phone out.
    "CHECK_REVOKE_TOKEN": True,
}

CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o
]

# --- Email ---
# With no EMAIL_HOST, emails are printed in the terminal running the server (handy while developing).
# Set EMAIL_HOST (and the rest) in .env to send real mail through an SMTP server.
if os.environ.get("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ["EMAIL_HOST"]
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "1") == "1"
    EMAIL_TIMEOUT = 15  # seconds; never let a slow mail server hang a request
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "School <no-reply@localhost>")

# Send small batches of notifications while the user waits (1), or leave everything for the
# scheduled `send_notifications` command (0). See apps/notifications/services.py.
NOTIFICATIONS_SEND_NOW = os.environ.get("NOTIFICATIONS_SEND_NOW", "1") == "1"

# Where the React app lives. Used to build the links we put in emails.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
# A "forgot password" link works for two hours.
PASSWORD_RESET_TIMEOUT = 60 * 60 * 2

# --- Logging ---
# Warnings and errors go to the terminal AND to logs/app.log. The file is capped at 5 MB and
# keeps five old copies (app.log.1 ... app.log.5), so it can never fill the disk.
LOG_DIR = Path(os.environ.get("LOG_DIR") or BASE_DIR / "logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "{asctime} {levelname} {name}: {message}", "style": "{"}},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "app.log",
            "maxBytes": 5 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "plain",
            "level": "WARNING",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "school": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},  # our own messages
        "django.request": {"handlers": ["file"], "level": "ERROR"},  # crashes outside the API views
    },
}
