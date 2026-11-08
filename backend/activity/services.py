from .models import ActivityLog


def log_activity(
    workspace,
    actor,
    action,
    description,
    task=None,
):
    return ActivityLog.objects.create(
        workspace=workspace,
        actor=actor,
        action=action,
        description=description,
        task=task,
    )