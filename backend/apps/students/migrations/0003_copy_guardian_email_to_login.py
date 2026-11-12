from django.db import migrations


def copy_emails(apps, schema_editor):
    """Guardians who already have a portal login: give that login the guardian's email address."""
    Guardian = apps.get_model("students", "Guardian")
    for guardian in Guardian.objects.exclude(user=None).exclude(email="").select_related("user"):
        if guardian.user.email != guardian.email:
            guardian.user.email = guardian.email
            guardian.user.save(update_fields=["email"])


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0002_student_medical_info"),
        ("core", "0003_school_time_zone"),
    ]

    operations = [
        # The second argument is what to do when the migration is undone: nothing.
        migrations.RunPython(copy_emails, migrations.RunPython.noop),
    ]
