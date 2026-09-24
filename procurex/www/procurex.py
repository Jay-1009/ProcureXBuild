import frappe

no_cache = 1


def get_context(context):
    # Guests are allowed through: ProcureX is a client-rendered SPA with its own /auth screen
    # for supplier sign-in/sign-up (a brand-new supplier has no Frappe user account yet).
    # Every actual data endpoint is whitelisted separately in procurex.api and checks
    # frappe.session.user itself.
    frappe.db.commit()  # nosemgrep
    context.csrf_token = frappe.sessions.get_csrf_token()
    context.boot = get_boot()
    return context


def get_boot():
    return frappe._dict(
        {
            "site_name": frappe.local.site,
            "session_user": frappe.session.user,
            "default_route": "/procurex",
        }
    )
