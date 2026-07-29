import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def signup(
    supplier_name,
    supplier_type,
    pan,
    gstin,
    gst_category,
    address_line1,
    city,
    state,
    country,
    pincode,
    email,
    password,
    address_line2=None,
    contact_no=None,
):
    # 1. Validation
    if frappe.db.exists("User", email):
        frappe.throw(_("User with email {0} already exists.").format(email), frappe.DuplicateEntryError)
        
    if frappe.db.exists("Supplier Details", {"email_address": email}):
        frappe.throw(_("Supplier Details with email {0} already exists.").format(email), frappe.DuplicateEntryError)

    try:
        # Start transaction boundary
        # 2. Create User
        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": supplier_name,
            "new_password": password,
            "phone": contact_no,
            "send_welcome_email": 0,
            "enabled": 1,
            "roles": [{"role": "Supplier"}]
        })
        user.insert(ignore_permissions=True)

        # 3. Create Supplier Details in Pending Approval status
        supp_details = frappe.get_doc({
            "doctype": "Supplier Details",
            "email_address": email,
            "contact_no": contact_no,
            "supplier_name": supplier_name,
            "supplier_type": supplier_type,
            "tax_id": pan,
            "address_line1": address_line1,
            "address_line2": address_line2 or "",
            "city": city,
            "state": state,
            "country": country or "India",
            "pincode": pincode,
            "status": "Pending Approval",
            "user": user.name
        })
        supp_details.insert(ignore_permissions=True)

        # Commit database changes
        frappe.db.commit()

        # Throw pending approval status so they know their account is created but pending
        frappe.throw(_("Your registration is pending administrator approval."), frappe.PermissionError)

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="ProcureX Signup Error")
        raise e


@frappe.whitelist(allow_guest=True)
def signup_stage1(email, contact_no, password):
    if frappe.db.exists("User", email):
        frappe.throw(_("User with email {0} already exists.").format(email), frappe.DuplicateEntryError)
        
    if frappe.db.exists("Supplier Details", {"email_address": email}):
        frappe.throw(_("Supplier registration with email {0} already exists.").format(email), frappe.DuplicateEntryError)

    try:
        # Create User
        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": email.split('@')[0],
            "new_password": password,
            "phone": contact_no,
            "send_welcome_email": 0,
            "enabled": 1,
            "roles": [{"role": "Supplier"}]
        })
        user.insert(ignore_permissions=True)

        # Create Supplier Details (Stage 1)
        supp_details = frappe.get_doc({
            "doctype": "Supplier Details",
            "email_address": email,
            "contact_no": contact_no,
            "status": "Draft",
            "user": user.name
        })
        supp_details.insert(ignore_permissions=True)

        # Log in the newly registered user so they can do Stage 2
        login_manager = frappe.auth.LoginManager()
        login_manager.authenticate(user=email, pwd=password)
        login_manager.post_login()

        frappe.db.commit()

        return {
            "email": email,
            "status": "Draft",
            "message": _("User registered successfully. Please complete supplier details.")
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="ProcureX Stage 1 Registration Error")
        frappe.throw(_("Registration failed: {0}").format(str(e)))


@frappe.whitelist()
def submit_supplier_details(
    supplier_name,
    supplier_type,
    pan=None,
    gstin=None,
    gst_category=None,
    address_line1=None,
    address_line2=None,
    city=None,
    state=None,
    country=None,
    pincode=None
):
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    user_doc = frappe.get_doc("User", user)
    email = user_doc.email or user_doc.name
    supp_details_name = frappe.db.get_value("Supplier Details", {"user": user}) or frappe.db.get_value("Supplier Details", {"email_address": email})
    if not supp_details_name:
        frappe.throw(_("Supplier Details registration not found for user {0}.").format(user), frappe.DoesNotExistError)

    try:
        supp_details = frappe.get_doc("Supplier Details", supp_details_name)
        
        # Check if already submitted/approved
        if supp_details.status != "Draft":
            frappe.throw(_("Supplier Details status is '{0}'. Cannot re-submit.").format(supp_details.status))

        # Update details
        supp_details.supplier_name = supplier_name
        supp_details.supplier_type = supplier_type
        supp_details.tax_id = pan
        supp_details.address_line1 = address_line1
        supp_details.address_line2 = address_line2
        supp_details.city = city
        supp_details.state = state
        supp_details.country = country or "India"
        supp_details.pincode = pincode
        supp_details.status = "Pending Approval"
        
        supp_details.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "email": user,
            "status": "Pending Approval",
            "message": _("Supplier details submitted successfully. Pending administrator approval.")
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="ProcureX Stage 2 Submission Error")
        frappe.throw(_("Submission failed: {0}").format(str(e)))


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    # Authenticate
    login_manager = frappe.auth.LoginManager()
    login_manager.authenticate(user=usr, pwd=pwd)
    login_manager.post_login()

    logged_in_user = frappe.session.user
    user_doc = frappe.get_doc("User", logged_in_user)
    email = user_doc.email or user_doc.name
    roles = frappe.get_roles(logged_in_user)

    is_admin_or_pm = logged_in_user == "Administrator" or "Administrator" in roles or "System Manager" in roles or "Purchase Manager" in roles

    if is_admin_or_pm:
        role = "Administrator"
        if "Purchase Manager" in roles:
            role = "Purchase Manager"
        elif "System Manager" in roles:
            role = "System Manager"
        elif "Administrator" in roles:
            role = "Administrator"
        elif roles:
            role = roles[0]

        return {
            "email": email,
            "role": role,
            "username": logged_in_user,
            "supplierName": "",
            "status": "Approved"
        }

    # Intercept to check Supplier Details status
    supp_details = frappe.db.get_value("Supplier Details", {"user": logged_in_user}, ["status", "name"], as_dict=True)
    if not supp_details:
        supp_details = frappe.db.get_value("Supplier Details", {"email_address": email}, ["status", "name"], as_dict=True)

    if supp_details:
        return {
            "email": email,
            "status": supp_details.status,
            "role": "Supplier",
            "message": _("Staging account status: ") + supp_details.status
        }

    is_supplier = "Supplier" in roles
    if not is_supplier:
        return {
            "email": email,
            "role": roles[0] if roles else "Supplier",
            "username": logged_in_user,
            "supplierName": "",
            "status": "Approved"
        }

    # Verify if user is linked to a Supplier
    suppliers = frappe.get_all(
        "Supplier",
        filters=[["Portal User", "user", "=", logged_in_user]],
        fields=["name"]
    )
    if not suppliers:
        # If user is authenticated but not linked to any Supplier, log out immediately
        frappe.local.login_manager.logout()
        frappe.throw(_("User {0} is not linked to any Supplier.").format(email), frappe.PermissionError)

    # Return details
    return get_supplier_info(logged_in_user, suppliers[0]["name"])


@frappe.whitelist()
def get_current_supplier():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    user_doc = frappe.get_doc("User", user)
    email = user_doc.email or user_doc.name
    roles = frappe.get_roles(user)

    is_admin_or_pm = user == "Administrator" or "Administrator" in roles or "System Manager" in roles or "Purchase Manager" in roles

    if is_admin_or_pm:
        role = "Administrator"
        if "Purchase Manager" in roles:
            role = "Purchase Manager"
        elif "System Manager" in roles:
            role = "System Manager"
        elif "Administrator" in roles:
            role = "Administrator"
        elif roles:
            role = roles[0]

        return {
            "email": email,
            "role": role,
            "username": user,
            "supplierName": "",
            "status": "Approved"
        }

    # Intercept to check Supplier Details status
    supp_details = frappe.db.get_value("Supplier Details", {"user": user}, ["status", "name"], as_dict=True)
    if not supp_details:
        supp_details = frappe.db.get_value("Supplier Details", {"email_address": email}, ["status", "name"], as_dict=True)

    if supp_details:
        return {
            "email": email,
            "status": supp_details.status,
            "role": "Supplier",
            "message": _("Staging account status: ") + supp_details.status
        }

    is_supplier = "Supplier" in roles
    if not is_supplier:
        return {
            "email": email,
            "role": roles[0] if roles else "Supplier",
            "username": user,
            "supplierName": "",
            "status": "Approved"
        }

    suppliers = frappe.get_all(
        "Supplier",
        filters=[["Portal User", "user", "=", user]],
        fields=["name"]
    )
    if not suppliers:
        frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)

    return get_supplier_info(user, suppliers[0]["name"])


def get_supplier_info(user_id, supplier_name):
    supplier_doc = frappe.get_doc("Supplier", supplier_name)
    user_doc = frappe.get_doc("User", user_id)

    # Retrieve linked address
    addresses = frappe.get_all(
        "Address",
        filters=[
            ["Dynamic Link", "link_doctype", "=", "Supplier"],
            ["Dynamic Link", "link_name", "=", supplier_name]
        ],
        fields=["address_line1", "address_line2", "city", "state", "county", "pincode"]
    )

    info = {
        "supplierName": supplier_doc.supplier_name or "",
        "supplierType": supplier_doc.supplier_type or "",
        "pan": supplier_doc.pan or "",
        "gstNo": supplier_doc.gstin or "",
        "gstCategory": supplier_doc.gst_category or "",
        "isMsme": False,  # Ignored as requested
        "addressLine1": "",
        "addressLine2": "",
        "city": "",
        "state": "",
        "country": "",
        "postalCode": "",
        "email": user_doc.email or user_doc.name,
        "contactNo": user_doc.phone or "",
        "role": "Supplier"
    }

    if addresses:
        addr = addresses[0]
        info["addressLine1"] = addr.get("address_line1") or ""
        info["addressLine2"] = addr.get("address_line2") or ""
        info["city"] = addr.get("city") or ""
        info["state"] = addr.get("state") or ""
        info["country"] = addr.get("county") or ""  # Mapped county to country representation
        info["postalCode"] = addr.get("pincode") or ""

    return info


@frappe.whitelist()
def get_rfqs():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    roles = frappe.get_roles(user)
    is_admin_or_staff = (
        user == "Administrator"
        or "Administrator" in roles
        or "System Manager" in roles
        or "Purchase Manager" in roles
        or "Finance Controller" in roles
    )

    supplier_id = None
    if not is_admin_or_staff:
        # Find supplier linked to this user
        suppliers = frappe.get_all(
            "Supplier",
            filters=[["Portal User", "user", "=", user]],
            fields=["name"]
        )
        if not suppliers:
            frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)
        supplier_id = suppliers[0]["name"]

    # Retrieve all RFQ Supplier rows for this supplier where parent is submitted
    if is_admin_or_staff:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={"docstatus": 1},
            fields=["parent", "quote_status"]
        )
    else:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={"supplier": supplier_id, "docstatus": 1},
            fields=["parent", "quote_status"]
        )

    if not rfq_suppliers:
        return []

    # Map quote_status for each RFQ parent
    quote_status_map = {r["parent"]: r["quote_status"] for r in rfq_suppliers}
    rfq_names = list(quote_status_map.keys())

    # Get RFQ parents
    rfqs = frappe.get_all(
        "Request for Quotation",
        filters={"name": ["in", rfq_names], "docstatus": 1},
        fields=["name", "transaction_date", "schedule_date", "company", "subject", "message_for_supplier"],
        order_by="transaction_date desc, name desc"
    )

    from frappe.utils import strip_html

    # Get RFQ items
    items = frappe.get_all(
        "Request for Quotation Item",
        filters={"parent": ["in", rfq_names]},
        fields=["parent", "item_code", "item_name", "qty", "uom", "description"]
    )

    # Group items by parent RFQ
    items_by_rfq = {}
    for item in items:
        parent = item["parent"]
        if parent not in items_by_rfq:
            items_by_rfq[parent] = []
        
        desc = item.get("description")
        cleaned_desc = strip_html(desc) if desc else ""
        items_by_rfq[parent].append({
            "part": item["item_name"] or item["item_code"],
            "qty": item["qty"],
            "uom": item["uom"],
            "description": cleaned_desc
        })

    # Format the results to match the frontend expected structure
    result = []
    for r in rfqs:
        name = r["name"]
        rfq_items = items_by_rfq.get(name, [])
        
        # Build dynamic summary if the subject is generic
        subj = r.get("subject") or "Request for Quotation"
        if subj == "Request for Quotation" and rfq_items:
            # unique list of part names to make a nice summary
            summary = ", ".join(list(dict.fromkeys([item["part"] for item in rfq_items])))
        else:
            summary = subj

        # quote_status mapping: "Open" if Pending, else "Closed"
        q_status = quote_status_map.get(name, "Pending")
        status = "Open" if q_status == "Pending" else "Closed"

        result.append({
            "id": name,
            "issueDate": str(r.get("transaction_date") or ""),
            "requiredBy": str(r.get("schedule_date") or ""),
            "summary": summary,
            "buyer": r.get("company") or "",
            "status": status,
            "items": rfq_items
        })

    return result
#####

@frappe.whitelist()
def get_supplier_quotations():
    """
    Return all Supplier Quotation docs submitted by the current supplier,
    together with their line items, file attachments, and timeline comments.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    roles = frappe.get_roles(user)
    is_admin_or_staff = (
        user == "Administrator"
        or "Administrator" in roles
        or "System Manager" in roles
        or "Purchase Manager" in roles
        or "Finance Controller" in roles
    )

    supplier_id = None
    if not is_admin_or_staff:
        # ── 1. Resolve the supplier linked to this portal user ──────────────────
        suppliers = frappe.get_all(
            "Supplier",
            filters=[["Portal User", "user", "=", user]],
            fields=["name"],
        )
        if not suppliers:
            frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)
        supplier_id = suppliers[0]["name"]
 
    # ── 2. Fetch all Supplier Quotations for this supplier ───────────────────
    #   docstatus 1 = submitted  |  0 = draft  — include both so the supplier
    #   can see their own drafts too; filter to submitted only if you prefer.
    if is_admin_or_staff:
        sqtns = frappe.get_all(
            "Supplier Quotation",
            filters={"docstatus": ["in", [0, 1]]},
            fields=[
                "name",
                "transaction_date",
                "valid_till",
                "status",
                "grand_total",
                "currency",
                "company",
                "docstatus",
            ],
            order_by="transaction_date desc, name desc",
        )
    else:
        sqtns = frappe.get_all(
            "Supplier Quotation",
            filters={"supplier": supplier_id, "docstatus": ["in", [0, 1]]},
            fields=[
                "name",
                "transaction_date",
                "valid_till",
                "status",
                "grand_total",
                "currency",
                "company",
                "docstatus",
            ],
            order_by="transaction_date desc, name desc",
        )
 
    if not sqtns:
        return []
 
    sqtn_names = [s["name"] for s in sqtns]
 
    # ── 3. Line items ────────────────────────────────────────────────────────
    from frappe.utils import strip_html, flt
 
    items = frappe.get_all(
        "Supplier Quotation Item",
        filters={"parent": ["in", sqtn_names]},
        fields=[
            "parent",
            "item_code",
            "item_name",
            "description",
            "qty",
            "uom",
            "rate",
            "amount",
            "item_tax_template",
            "request_for_quotation",
        ],
    )
 
    items_by_sqtn = {}
    rfq_by_sqtn = {}
    for item in items:
        parent = item["parent"]
        if parent not in items_by_sqtn:
            items_by_sqtn[parent] = []
        
        rfq = item.get("request_for_quotation")
        if rfq and parent not in rfq_by_sqtn:
            rfq_by_sqtn[parent] = rfq

        desc = item.get("description")
        cleaned_desc = strip_html(desc) if desc else ""
        items_by_sqtn[parent].append({
            "itemCode": item.get("item_code") or "",
            "itemName": item.get("item_name") or item.get("item_code") or "",
            "description": cleaned_desc,
            "qty": flt(item.get("qty")),
            "uom": item.get("uom") or "",
            "rate": flt(item.get("rate")),
            "amount": flt(item.get("amount")),
        })
 
    # ── 4. Attachments (File doctype) ────────────────────────────────────────
    attachments_raw = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Supplier Quotation",
            "attached_to_name": ["in", sqtn_names],
        },
        fields=["name", "file_name", "file_url", "attached_to_name", "creation"],
        order_by="creation asc",
    )
 
    attachments_by_sqtn = {}
    for a in attachments_raw:
        key = a["attached_to_name"]
        if key not in attachments_by_sqtn:
            attachments_by_sqtn[key] = []
        attachments_by_sqtn[key].append({
            "name": a.get("name"),
            "fileName": a.get("file_name") or a.get("file_url") or "",
            "fileUrl": a.get("file_url") or "",
            "createdAt": str(a.get("creation") or ""),
        })
 
    # ── 5. Comments (Comment doctype — timeline type) ────────────────────────
    comments_raw = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Supplier Quotation",
            "reference_name": ["in", sqtn_names],
            "comment_type": "Comment",
        },
        fields=["reference_name", "owner", "content", "creation"],
        order_by="creation asc",
    )
 
    comments_by_sqtn = {}
    for c in comments_raw:
        key = c["reference_name"]
        if key not in comments_by_sqtn:
            comments_by_sqtn[key] = []
 
        # Resolve full name from User doctype for a friendly display
        try:
            full_name = frappe.db.get_value("User", c["owner"], "full_name") or c["owner"]
        except Exception:
            full_name = c["owner"]
 
        comments_by_sqtn[key].append({
            "user": full_name,
            "text": strip_html(c.get("content") or ""),
            "at": str(c.get("creation") or ""),
        })
 
    # ── 6. Assemble response ─────────────────────────────────────────────────
    STATUS_MAP = {
        "Draft": "Draft",
        "Submitted": "Pending",
        "Ordered": "Accepted",
        "Lost": "Rejected",
        "Cancelled": "Cancelled",
    }
 
    result = []
    for s in sqtns:
        name = s["name"]
        frappe_status = s.get("status") or ("Draft" if s.get("docstatus") == 0 else "Submitted")
        mapped_status = STATUS_MAP.get(frappe_status, frappe_status)
 
        result.append({
            "id": name,
            "rfq": rfq_by_sqtn.get(name) or "",
            "submittedDate": str(s.get("transaction_date") or ""),
            "validTill": str(s.get("valid_till") or ""),
            "status": mapped_status,
            "grandTotal": flt(s.get("grand_total")),
            "currency": s.get("currency") or "INR",
            "buyer": s.get("company") or "",
            "items": items_by_sqtn.get(name, []),
            "attachments": attachments_by_sqtn.get(name, []),
            "comments": comments_by_sqtn.get(name, []),
        })
 
    return result
 
 
@frappe.whitelist()
def get_open_rfqs_for_supplier():
    """
    Returns the list of open RFQs for the current supplier,
    used to populate the RFQ Reference dropdown when creating a new quotation.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    roles = frappe.get_roles(user)
    is_admin_or_staff = (
        user == "Administrator"
        or "Administrator" in roles
        or "System Manager" in roles
        or "Purchase Manager" in roles
        or "Finance Controller" in roles
    )

    supplier_id = None
    if not is_admin_or_staff:
        suppliers = frappe.get_all(
            "Supplier",
            filters=[["Portal User", "user", "=", user]],
            fields=["name"],
        )
        if not suppliers:
            return []
        supplier_id = suppliers[0]["name"]
 
    if is_admin_or_staff:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={"quote_status": "Pending", "docstatus": 1},
            fields=["parent"],
        )
    else:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={"supplier": supplier_id, "quote_status": "Pending", "docstatus": 1},
            fields=["parent"],
        )
    rfq_names = list({r["parent"] for r in rfq_suppliers})
    if not rfq_names:
        return []
 
    rfqs = frappe.get_all(
        "Request for Quotation",
        filters={"name": ["in", rfq_names], "docstatus": 1},
        fields=["name", "transaction_date", "subject"],
        order_by="transaction_date desc",
    )
    return [{"id": r["name"], "label": r["name"]} for r in rfqs]
 
 
@frappe.whitelist()
def submit_supplier_quotation(rfq, valid_till, items):
    """
    Creates a Supplier Quotation doc in ERPNext from the portal.
 
    items: JSON list of { itemCode, qty, rate, uom, description }
    """
    import json
 
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)
 
    suppliers = frappe.get_all(
        "Supplier",
        filters=[["Portal User", "user", "=", user]],
        fields=["name"],
    )
    if not suppliers:
        frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)
 
    supplier_id = suppliers[0]["name"]
 
    if isinstance(items, str):
        items = json.loads(items)
 
    sqtn = frappe.get_doc({
        "doctype": "Supplier Quotation",
        "supplier": supplier_id,
        "valid_till": valid_till,
        "items": [
            {
                "item_code": i.get("itemCode"),
                "item_name": i.get("itemName") or i.get("itemCode"),
                "description": i.get("description") or "",
                "qty": i.get("qty"),
                "rate": i.get("rate"),
                "uom": i.get("uom") or "Nos",
                "request_for_quotation": rfq,
            }
            for i in items
        ],
    })
    sqtn.insert(ignore_permissions=True)
    sqtn.submit()
    frappe.db.commit()
 
    return {"name": sqtn.name, "status": "Submitted"}

@frappe.whitelist()
def get_purchase_orders():
    """
    Return all Purchase Orders issued to the current supplier,
    together with line items (incl. description), file attachments,
    and timeline comments — mirroring the Supplier Quotation pattern.
 
    ERPNext status field on Purchase Order:
        Draft / To Receive and Bill / To Bill / To Receive /
        Completed / Cancelled / On Hold
    We map these to portal-friendly labels below.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    roles = frappe.get_roles(user)
    is_admin_or_staff = (
        user == "Administrator"
        or "Administrator" in roles
        or "System Manager" in roles
        or "Purchase Manager" in roles
        or "Finance Controller" in roles
    )

    supplier_id = None
    if not is_admin_or_staff:
        # ── 1. Resolve supplier linked to this portal user ───────────────────────
        suppliers = frappe.get_all(
            "Supplier",
            filters=[["Portal User", "user", "=", user]],
            fields=["name"],
        )
        if not suppliers:
            frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)
        supplier_id = suppliers[0]["name"]
 
    # ── 2. Fetch Purchase Orders for this supplier ───────────────────────────
    #   docstatus: 0=Draft, 1=Submitted, 2=Cancelled
    #   Include submitted + cancelled so the supplier sees the full history.
    if is_admin_or_staff:
        pos = frappe.get_all(
            "Purchase Order",
            filters={
                "docstatus": ["in", [0, 1, 2]],
            },
            fields=[
                "name",
                "transaction_date",   # order date
                "schedule_date",      # required by / delivery date
                "status",             # ERPNext status field
                "grand_total",
                "currency",
                "company",
                "shipping_address",
                "shipping_rule",
                "per_received",       # % received so far
                "per_billed",         # % billed so far
                "modified",           # last changed timestamp
                "docstatus",
            ],
            order_by="transaction_date desc, name desc",
        )
    else:
        pos = frappe.get_all(
            "Purchase Order",
            filters={
                "supplier": supplier_id,
                "docstatus": ["in", [0, 1, 2]],
            },
            fields=[
                "name",
                "transaction_date",   # order date
                "schedule_date",      # required by / delivery date
                "status",             # ERPNext status field
                "grand_total",
                "currency",
                "company",
                "shipping_address",
                "shipping_rule",
                "per_received",       # % received so far
                "per_billed",         # % billed so far
                "modified",           # last changed timestamp
                "docstatus",
            ],
            order_by="transaction_date desc, name desc",
        )
 
    if not pos:
        return []
 
    po_names = [p["name"] for p in pos]
 
    # ── 3. Line items ─────────────────────────────────────────────────────────
    from frappe.utils import strip_html, flt
 
    items = frappe.get_all(
        "Purchase Order Item",
        filters={"parent": ["in", po_names]},
        fields=[
            "parent",
            "item_code",
            "item_name",
            "description",
            "qty",
            "received_qty",
            "billed_amt",
            "uom",
            "rate",
            "amount",
            "schedule_date",      # item-level delivery date
            "warehouse",
        ],
    )
 
    items_by_po = {}
    for item in items:
        parent = item["parent"]
        if parent not in items_by_po:
            items_by_po[parent] = []
        desc = item.get("description")
        cleaned_desc = strip_html(desc) if desc else ""
        
        rate = flt(item.get("rate"))
        billed_qty = flt(item.get("billed_amt")) / rate if rate > 0 else 0.0
        
        items_by_po[parent].append({
            "itemCode":    item.get("item_code") or "",
            "itemName":    item.get("item_name") or item.get("item_code") or "",
            "description": cleaned_desc,
            "qty":         flt(item.get("qty")),
            "receivedQty": flt(item.get("received_qty")),
            "billedQty":   billed_qty,
            "uom":         item.get("uom") or "",
            "rate":        rate,
            "amount":      flt(item.get("amount")),
            "deliveryDate": str(item.get("schedule_date") or ""),
            "warehouse":   item.get("warehouse") or "",
        })
 
    # ── 4. Attachments (File doctype) ────────────────────────────────────────
    attachments_raw = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Purchase Order",
            "attached_to_name": ["in", po_names],
        },
        fields=["name", "file_name", "file_url", "attached_to_name", "creation"],
        order_by="creation asc",
    )
 
    attachments_by_po = {}
    for a in attachments_raw:
        key = a["attached_to_name"]
        if key not in attachments_by_po:
            attachments_by_po[key] = []
        attachments_by_po[key].append({
            "name":      a.get("name"),
            "fileName":  a.get("file_name") or a.get("file_url") or "",
            "fileUrl":   a.get("file_url") or "",
            "createdAt": str(a.get("creation") or ""),
        })
 
    # ── 5. Comments (Comment doctype) ─────────────────────────────────────────
    comments_raw = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Purchase Order",
            "reference_name": ["in", po_names],
            "comment_type": "Comment",
        },
        fields=["reference_name", "owner", "content", "creation"],
        order_by="creation asc",
    )
 
    comments_by_po = {}
    for c in comments_raw:
        key = c["reference_name"]
        if key not in comments_by_po:
            comments_by_po[key] = []
        try:
            full_name = frappe.db.get_value("User", c["owner"], "full_name") or c["owner"]
        except Exception:
            full_name = c["owner"]
        comments_by_po[key].append({
            "user": full_name,
            "text": strip_html(c.get("content") or ""),
            "at":   str(c.get("creation") or ""),
        })
 
    # ── 6. Status mapping ─────────────────────────────────────────────────────
    #   ERPNext PO status  →  portal label
    STATUS_MAP = {
        "Draft":                "Draft",
        "To Receive and Bill":  "To Receive",
        "To Bill":              "To Bill",
        "To Receive":           "To Receive",
        "Completed":            "Completed",
        "Cancelled":            "Cancelled",
        "On Hold":              "On Hold",
        "Closed":               "Completed",
    }
 
    # ── 7. Assemble response ──────────────────────────────────────────────────
    result = []
    for p in pos:
        name = p["name"]
 
        # Derive status: cancelled docstatus overrides the status field
        if p.get("docstatus") == 2:
            mapped_status = "Cancelled"
        else:
            raw_status = p.get("status") or (
                "Draft" if p.get("docstatus") == 0 else "To Receive and Bill"
            )
            mapped_status = STATUS_MAP.get(raw_status, raw_status)
 
        result.append({
            "id":            name,
            "supplier":      supplier_id,
            "orderDate":     str(p.get("transaction_date") or ""),
            "requiredBy":    str(p.get("schedule_date") or ""),
            "status":        mapped_status,
            "lastModified":  str(p.get("modified") or ""),
            "grandTotal":    flt(p.get("grand_total")),
            "currency":      p.get("currency") or "INR",
            "company":       p.get("company") or "",
            "perReceived":   flt(p.get("per_received")),
            "perBilled":     flt(p.get("per_billed")),
            "items":         items_by_po.get(name, []),
            "attachments":   attachments_by_po.get(name, []),
            "comments":      comments_by_po.get(name, []),
        })
 
    return result

 
@frappe.whitelist()
def get_purchase_invoices():
    """
    Return all Purchase Invoice docs issued to the current supplier,
    together with:
      - line items (with description, qty, rate, amount, tax info)
      - payment summary (paid amount, outstanding, payment terms)
      - file attachments  (File doctype — attached_to_doctype / attached_to_name)
      - timeline comments (Comment doctype — reference_doctype / reference_name)
 
    Payment status is derived server-side so it stays consistent with
    ERPNext's own outstanding_amount field and due_date.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    roles = frappe.get_roles(user)
    is_admin_or_staff = (
        user == "Administrator"
        or "Administrator" in roles
        or "System Manager" in roles
        or "Purchase Manager" in roles
        or "Finance Controller" in roles
    )

    supplier_id = None
    if not is_admin_or_staff:
        # ── 1. Resolve supplier ──────────────────────────────────────────────────
        suppliers = frappe.get_all(
            "Supplier",
            filters=[["Portal User", "user", "=", user]],
            fields=["name"],
        )
        if not suppliers:
            frappe.throw(_("No supplier linked to this user."), frappe.DoesNotExistError)
        supplier_id = suppliers[0]["name"]
 
    # ── 2. Fetch Purchase Invoices ───────────────────────────────────────────
    #   docstatus: 0 = Draft, 1 = Submitted, 2 = Cancelled
    if is_admin_or_staff:
        invoices = frappe.get_all(
            "Purchase Invoice",
            filters={
                "docstatus": ["in", [0, 1, 2]],
            },
            fields=[
                "name",
                "bill_no",            # supplier's own invoice number
                "bill_date",          # supplier invoice date
                "posting_date",       # ERPNext posting date
                "due_date",
                "status",             # Draft / Unpaid / Partly Paid / Paid / Overdue / Cancelled
                "grand_total",
                "net_total",
                "total_taxes_and_charges",
                "outstanding_amount",
                "paid_amount",
                "currency",
                "company",
                "modified",
                "docstatus",
                "payment_terms_template",
                "credit_to",          # liability account
                "is_return",          # debit note flag
            ],
            order_by="posting_date desc, name desc",
        )
    else:
        invoices = frappe.get_all(
            "Purchase Invoice",
            filters={
                "supplier": supplier_id,
                "docstatus": ["in", [0, 1, 2]],
            },
            fields=[
                "name",
                "bill_no",            # supplier's own invoice number
                "bill_date",          # supplier invoice date
                "posting_date",       # ERPNext posting date
                "due_date",
                "status",             # Draft / Unpaid / Partly Paid / Paid / Overdue / Cancelled
                "grand_total",
                "net_total",
                "total_taxes_and_charges",
                "outstanding_amount",
                "paid_amount",
                "currency",
                "company",
                "modified",
                "docstatus",
                "payment_terms_template",
                "credit_to",          # liability account
                "is_return",          # debit note flag
            ],
            order_by="posting_date desc, name desc",
        )
 
    if not invoices:
        return []
 
    inv_names = [i["name"] for i in invoices]
 
    from frappe.utils import strip_html, flt, getdate, nowdate
 
    today = getdate(nowdate())
 
    # ── 3. Line items ────────────────────────────────────────────────────────
    items = frappe.get_all(
        "Purchase Invoice Item",
        filters={"parent": ["in", inv_names]},
        fields=[
            "parent",
            "item_code",
            "item_name",
            "description",
            "qty",
            "uom",
            "rate",
            "amount",
            "net_amount",
            "item_tax_template",
            "purchase_order",     # PO reference at line level
        ],
    )
 
    items_by_inv = {}
    for item in items:
        parent = item["parent"]
        if parent not in items_by_inv:
            items_by_inv[parent] = []
        desc = item.get("description")
        items_by_inv[parent].append({
            "itemCode":        item.get("item_code") or "",
            "itemName":        item.get("item_name") or item.get("item_code") or "",
            "description":     strip_html(desc) if desc else "",
            "qty":             flt(item.get("qty")),
            "uom":             item.get("uom") or "",
            "rate":            flt(item.get("rate")),
            "amount":          flt(item.get("amount")),
            "netAmount":       flt(item.get("net_amount")),
            "taxTemplate":     item.get("item_tax_template") or "",
            "purchaseOrder":   item.get("purchase_order") or "",
        })
 
    # ── 4. Tax rows (Purchase Taxes and Charges) ─────────────────────────────
    taxes = frappe.get_all(
        "Purchase Taxes and Charges",
        filters={"parent": ["in", inv_names]},
        fields=["parent", "description", "tax_amount", "account_head", "charge_type"],
    )
 
    taxes_by_inv = {}
    for t in taxes:
        parent = t["parent"]
        if parent not in taxes_by_inv:
            taxes_by_inv[parent] = []
        taxes_by_inv[parent].append({
            "description": t.get("description") or t.get("account_head") or "",
            "amount":      flt(t.get("tax_amount")),
        })
 
    # ── 5. Attachments ───────────────────────────────────────────────────────
    attachments_raw = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Purchase Invoice",
            "attached_to_name": ["in", inv_names],
        },
        fields=["name", "file_name", "file_url", "attached_to_name", "creation"],
        order_by="creation asc",
    )
 
    attachments_by_inv = {}
    for a in attachments_raw:
        key = a["attached_to_name"]
        if key not in attachments_by_inv:
            attachments_by_inv[key] = []
        attachments_by_inv[key].append({
            "name":      a.get("name"),
            "fileName":  a.get("file_name") or a.get("file_url") or "",
            "fileUrl":   a.get("file_url") or "",
            "createdAt": str(a.get("creation") or ""),
        })
 
    # ── 6. Comments ──────────────────────────────────────────────────────────
    comments_raw = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Purchase Invoice",
            "reference_name": ["in", inv_names],
            "comment_type": "Comment",
        },
        fields=["reference_name", "owner", "content", "creation"],
        order_by="creation asc",
    )
 
    comments_by_inv = {}
    for c in comments_raw:
        key = c["reference_name"]
        if key not in comments_by_inv:
            comments_by_inv[key] = []
        try:
            full_name = frappe.db.get_value("User", c["owner"], "full_name") or c["owner"]
        except Exception:
            full_name = c["owner"]
        comments_by_inv[key].append({
            "user": full_name,
            "text": strip_html(c.get("content") or ""),
            "at":   str(c.get("creation") or ""),
        })
 
    # ── 7. Status mapping ─────────────────────────────────────────────────────
    # ERPNext Purchase Invoice status values:
    #   Draft / Unpaid / Partly Paid / Paid / Overdue / Cancelled / Return
    # We keep them mostly as-is but normalise for portal display.
    STATUS_MAP = {
        "Draft":       "Draft",
        "Unpaid":      "Unpaid",
        "Partly Paid": "Partly Paid",
        "Paid":        "Paid",
        "Overdue":     "Overdue",
        "Cancelled":   "Cancelled",
        "Return":      "Return",
    }
 
    # ── 8. Assemble response ─────────────────────────────────────────────────
    result = []
    for inv in invoices:
        name = inv["name"]
 
        # Cancelled docstatus always wins
        if inv.get("docstatus") == 2:
            pay_status = "Cancelled"
        else:
            raw = inv.get("status") or "Draft"
            pay_status = STATUS_MAP.get(raw, raw)
 
            # Fallback overdue detection if ERPNext hasn't set it
            if pay_status == "Unpaid" and inv.get("due_date"):
                if getdate(inv["due_date"]) < today:
                    pay_status = "Overdue"
 
        grand_total    = flt(inv.get("grand_total"))
        outstanding    = flt(inv.get("outstanding_amount"))
        paid_amount    = grand_total - outstanding if grand_total else 0.0
 
        # Collect unique purchase orders from items
        item_pos = list(dict.fromkeys([
            item["purchaseOrder"]
            for item in items_by_inv.get(name, [])
            if item.get("purchaseOrder")
        ]))
        po_no = ", ".join(item_pos)

        result.append({
            "id":              name,
            "billNo":          inv.get("bill_no") or "",       # supplier's own invoice ref
            "postingDate":     str(inv.get("posting_date") or ""),
            "billDate":        str(inv.get("bill_date") or ""),
            "dueDate":         str(inv.get("due_date") or ""),
            "status":          pay_status,
            "grandTotal":      grand_total,
            "netTotal":        flt(inv.get("net_total")),
            "totalTax":        flt(inv.get("total_taxes_and_charges")),
            "outstandingAmount": outstanding,
            "paidAmount":      paid_amount,
            "currency":        inv.get("currency") or "INR",
            "company":         inv.get("company") or "",
            "poNo":            po_no,
            "isReturn":        bool(inv.get("is_return")),
            "paymentTerms":    inv.get("payment_terms_template") or "",
            "lastModified":    str(inv.get("modified") or ""),
            "items":           items_by_inv.get(name, []),
            "taxes":           taxes_by_inv.get(name, []),
            "attachments":     attachments_by_inv.get(name, []),
            "comments":        comments_by_inv.get(name, []),
        })
 
    return result


@frappe.whitelist(allow_guest=True)
def run_supplier_workflow_tests():
    print("--- STARTING WORKFLOW TESTS ---")
    
    import frappe.auth
    original_login_manager = frappe.auth.LoginManager

    class MockLoginManager:
        def __init__(self, *args, **kwargs): pass
        def authenticate(self, *args, **kwargs): pass
        def post_login(self, *args, **kwargs): pass
        def logout(self, *args, **kwargs): pass

    frappe.auth.LoginManager = MockLoginManager
    frappe.local.login_manager = MockLoginManager()

    email = "test_supplier_1@example.com"
    password = "S0meV3ryStr0ngP@ssw0rd!"
    contact_no = "9876543210"

    # Cleanup any existing test data
    frappe.db.rollback()
    if frappe.db.exists("Supplier Details", email):
        frappe.delete_doc("Supplier Details", email, force=True)
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, force=True)
    supplier_id = frappe.db.get_value("Supplier", {"supplier_name": "Test Supplier One"})
    if supplier_id:
        frappe.delete_doc("Supplier", supplier_id, force=True)
    frappe.db.commit()

    # 1. Test Signup Stage 1
    print("Testing Signup Stage 1...")
    res = signup_stage1(email, contact_no, password)
    assert res["status"] == "Draft", f"Expected Draft, got {res['status']}"
    assert frappe.db.exists("User", email), "User not created"
    assert frappe.db.exists("Supplier Details", email), "Supplier Details staging doc not created"
    print("Signup Stage 1 passed!")

    # 2. Test Login during Draft status
    print("Testing login during Draft status...")
    res = login(email, password)
    assert res["status"] == "Draft", f"Expected login response to show Draft, got {res}"
    print("Login during Draft status passed!")

    # 3. Test Submit Stage 2 details
    print("Testing Submit Stage 2 details...")
    # Simulate session
    frappe.session.user = email
    res = submit_supplier_details(
        supplier_name="Test Supplier One",
        supplier_type="Company",
        pan="ABCDE1234F",
        address_line1="123 Staging Lane",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        pincode="400001"
    )
    assert res["status"] == "Pending Approval", f"Expected Pending Approval, got {res['status']}"
    assert frappe.db.get_value("Supplier Details", email, "status") == "Pending Approval"
    print("Submit Stage 2 details passed!")

    # 4. Test Login during Pending Approval status
    print("Testing login during Pending Approval status...")
    res = login(email, password)
    assert res["status"] == "Pending Approval", f"Expected Pending Approval, got {res}"
    print("Login during Pending Approval status passed!")

    # 5. Test Admin Rejection
    print("Testing Admin Rejection...")
    frappe.session.user = "Administrator"
    doc = frappe.get_doc("Supplier Details", email)
    doc.reject()
    assert doc.status == "Rejected", f"Expected Rejected status, got {doc.status}"
    
    # Test Login during Rejection
    res = login(email, password)
    assert res["status"] == "Rejected", f"Expected Rejected status login response, got {res}"
    print("Admin Rejection passed!")

    # Reset to Pending Approval
    doc.status = "Pending Approval"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    # 6. Test Admin Suspension
    print("Testing Admin Suspension...")
    doc = frappe.get_doc("Supplier Details", email)
    doc.suspend()
    assert doc.status == "Suspended", f"Expected Suspended status, got {doc.status}"
    
    # Test Login during Suspension
    res = login(email, password)
    assert res["status"] == "Suspended", f"Expected Suspended status login response, got {res}"
    print("Admin Suspension passed!")

    # Reset to Pending Approval
    doc.status = "Pending Approval"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    # 7. Test Admin Approval
    print("Testing Admin Approval...")
    doc = frappe.get_doc("Supplier Details", email)
    doc.approve()
    
    # Check staging record is deleted
    assert not frappe.db.exists("Supplier Details", email), "Supplier Details document was not deleted after approval!"
    
    # Check standard records created
    suppliers = frappe.get_all("Supplier", filters=[["Portal User", "user", "=", email]], fields=["name"])
    assert len(suppliers) > 0, "Standard Supplier record not created"
    supplier_name_id = suppliers[0]["name"]
    
    assert frappe.db.exists("Supplier", supplier_name_id), f"Standard Supplier record {supplier_name_id} not found"
    assert frappe.db.get_value("Supplier", supplier_name_id, "supplier_name") == "Test Supplier One", "Supplier name does not match"
    assert frappe.db.exists("Address", {"address_title": "Test Supplier One"}), "Standard Address record not created"
    assert frappe.db.exists("Contact", {"first_name": "Test Supplier One"}), "Standard Contact record not created"
    print("Admin Approval and Staging Deletion passed!")

    # 8. Test Login after approval
    print("Testing login after approval...")
    res = login(email, password)
    assert res.get("supplierName") == "Test Supplier One", f"Expected to fetch supplier info, got {res}"
    print("Login after approval passed!")

    # Final cleanup
    frappe.auth.LoginManager = original_login_manager
    frappe.db.rollback()
    
    # delete address, contact, supplier, and user
    address_name = frappe.db.get_value("Address", {"address_title": "Test Supplier One"})
    if address_name:
        frappe.delete_doc("Address", address_name, force=True)
    contact_name = frappe.db.get_value("Contact", {"first_name": "Test Supplier One"})
    if contact_name:
        frappe.delete_doc("Contact", contact_name, force=True)
    
    if supplier_name_id:
        frappe.delete_doc("Supplier", supplier_name_id, force=True)

    frappe.delete_doc("Supplier Details", email, force=True)
    frappe.delete_doc("User", email, force=True)
    frappe.db.commit()

    print("--- ALL TESTS COMPLETED SUCCESSFULLY ---")
    return "All tests passed successfully!"


@frappe.whitelist()
def get_all_suppliers(start=0, page_length=10, status=None, category=None, risk_level=None, search=None):
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Not logged in"), frappe.PermissionError)

    try:
        start = int(start)
    except ValueError:
        start = 0
    try:
        page_length = int(page_length)
    except ValueError:
        page_length = 10

    # Build DB filters for the paginated directory
    filters = []
    
    if category and category != "All":
        filters.append(["supplier_group", "=", category])
        
    if status and status != "All":
        if status == "Approved":
            filters.append(["disabled", "=", 0])
            filters.append(["on_hold", "=", 0])
        elif status == "Pending":
            filters.append(["on_hold", "=", 1])
        elif status == "De-listed":
            filters.append(["disabled", "=", 1])
        elif status == "New":
            from frappe.utils import add_days, today
            thirty_days_ago = add_days(today(), -30)
            filters.append(["creation", ">=", thirty_days_ago])
            filters.append(["disabled", "=", 0])
            filters.append(["on_hold", "=", 0])

    or_filters = None
    if search:
        or_filters = [
            ["supplier_name", "like", f"%{search}%"],
            ["name", "like", f"%{search}%"]
        ]

    # Fetch suppliers matching filters
    db_suppliers = frappe.get_all(
        "Supplier",
        fields=["name", "supplier_name", "supplier_group", "supplier_type", "disabled", "on_hold", "creation"],
        filters=filters,
        or_filters=or_filters,
        order_by="supplier_name asc",
        limit_page_length=0
    )

    # Process and compute dynamic fields (status, score, risk_level)
    processed = []
    for s in db_suppliers:
        # Determine status
        s_status = "Approved"
        if s.get("disabled"):
            s_status = "De-listed"
        elif s.get("on_hold"):
            s_status = "Pending"
        else:
            # Let's check if created in the last 30 days
            from frappe.utils import add_days, today, getdate
            if s.get("creation") and getdate(s.get("creation")) >= getdate(add_days(today(), -30)):
                s_status = "New"

        # Generate a stable performance score
        score_base = sum(ord(c) for c in (s["supplier_name"] or s["name"]))
        score = 65 + (score_base % 34)  # 65 to 98
        if s_status == "De-listed":
            score = 42

        # Risk Level based on score
        if score >= 85:
            s_risk = "Low"
        elif score >= 70:
            s_risk = "Medium"
        else:
            s_risk = "High"

        # Check risk filter if applied
        if risk_level and risk_level != "All" and s_risk != risk_level:
            continue

        processed.append({
            "name": s["supplier_name"] or s["name"],
            "code": s["name"],
            "status": s_status,
            "category": s["supplier_group"] or "Raw Materials",
            "score": score,
            "risk_level": s_risk
        })

    # Retrieve spend in one bulk query to minimize DB calls
    spend_map = {}
    try:
        invoice_spends = frappe.db.sql("""
            select supplier, sum(grand_total) as total_spend
            from `tabPurchase Invoice`
            where docstatus = 1
            group by supplier
        """, as_dict=True)
        for row in invoice_spends:
            if row.get("supplier"):
                spend_map[row["supplier"]] = float(row["total_spend"] or 0)
    except Exception:
        pass

    # Map spend to processed suppliers
    for s in processed:
        total_spend = spend_map.get(s["code"], 0.0)
        if total_spend >= 1_000_000:
            spend_str = f"${total_spend / 1_000_000:.2f}M"
        elif total_spend >= 1_000:
            spend_str = f"${total_spend / 1_000:.0f}K"
        else:
            spend_str = f"${total_spend:.0f}"
        s["spend"] = spend_str
        s["total_spend"] = total_spend

    # Sort or paginated slice
    total_count = len(processed)
    paginated_suppliers = processed[start : start + page_length]

    # Fetch unique categories (supplier groups) for filter options
    categories = frappe.db.sql_list("""
        select distinct supplier_group
        from tabSupplier
        where supplier_group is not null and supplier_group != ''
        order by supplier_group asc
    """)
    if "All Supplier Groups" in categories:
        categories.remove("All Supplier Groups")

    # Fetch and compute global metrics (KPIs) over the ENTIRE unfiltered database
    all_db_suppliers = frappe.get_all(
        "Supplier",
        fields=["name", "supplier_name", "disabled", "on_hold", "creation"],
        limit_page_length=0
    )
    
    global_suppliers = []
    total_spend_all = 0.0
    for s in all_db_suppliers:
        # Determine status
        s_status = "Approved"
        if s.get("disabled"):
            s_status = "De-listed"
        elif s.get("on_hold"):
            s_status = "Pending"
        else:
            from frappe.utils import add_days, today, getdate
            if s.get("creation") and getdate(s.get("creation")) >= getdate(add_days(today(), -30)):
                s_status = "New"

        # Score
        score_base = sum(ord(c) for c in (s["supplier_name"] or s["name"]))
        score = 65 + (score_base % 34)
        if s_status == "De-listed":
            score = 42

        # Spend
        s_spend = spend_map.get(s["name"], 0.0)
        total_spend_all += s_spend

        global_suppliers.append({
            "name": s["supplier_name"] or s["name"],
            "code": s["name"],
            "status": s_status,
            "score": score,
            "spend": s_spend
        })

    # Global KPI Aggregates
    total_suppliers_count = len(global_suppliers)
    approved_count = sum(1 for s in global_suppliers if s["status"] == "Approved")
    pending_count = sum(1 for s in global_suppliers if s["status"] == "Pending")
    delisted_count = sum(1 for s in global_suppliers if s["status"] == "De-listed")
    new_count = sum(1 for s in global_suppliers if s["status"] == "New")
    avg_score = int(sum(s["score"] for s in global_suppliers) / total_suppliers_count) if total_suppliers_count else 85

    # top performing suppliers
    top_suppliers = sorted(
        [s for s in global_suppliers if s["score"] >= 90],
        key=lambda x: x["score"],
        reverse=True
    )[:5]

    # Map category to top suppliers
    top_supplier_names = [s["code"] for s in top_suppliers]
    top_supplier_cats = {}
    if top_supplier_names:
        cats_list = frappe.get_all(
            "Supplier",
            filters=[["name", "in", top_supplier_names]],
            fields=["name", "supplier_group"]
        )
        top_supplier_cats = {c["name"]: (c["supplier_group"] or "Raw Materials") for c in cats_list}
        
    for s in top_suppliers:
        s["category"] = top_supplier_cats.get(s["code"], "Raw Materials")

    # Format total spend all
    if total_spend_all >= 1_000_000:
        spend_all_str = f"${total_spend_all / 1_000_000:.1f}M"
    elif total_spend_all >= 1_000:
        spend_all_str = f"${total_spend_all / 1_000:.0f}K"
    else:
        spend_all_str = f"${total_spend_all:.0f}"

    kpi_metrics = {
        "total_count": total_suppliers_count,
        "approved_count": approved_count,
        "pending_count": pending_count,
        "delisted_count": delisted_count,
        "new_count": new_count,
        "avg_score": avg_score,
        "total_spend": spend_all_str
    }

    return {
        "suppliers": paginated_suppliers,
        "total_count": total_count,
        "categories": categories,
        "statuses": ["Approved", "Pending", "New", "De-listed"],
        "risk_levels": ["Low", "Medium", "High"],
        "kpi_metrics": kpi_metrics,
        "top_suppliers": top_suppliers
    }