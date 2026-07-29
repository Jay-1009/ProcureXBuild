# -*- coding: utf-8 -*-
# Copyright (c) 2026, Quantbit Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address

class SupplierDetails(Document):
	def validate(self):
		if self.email_address:
			validate_email_address(self.email_address, throw=True)
		
		# Prevent editing fields once approved
		if self.status == "Approved" and self.get_db_value("status") == "Approved":
			frappe.throw(_("Cannot modify approved Supplier Details."))

	@frappe.whitelist()
	def approve(self):
		if "System Manager" not in frappe.get_roles():
			frappe.throw(_("Not authorized to approve supplier."), frappe.PermissionError)

		if not self.supplier_name:
			frappe.throw(_("Supplier Name is required before approval."))

		if self.status == "Approved":
			frappe.throw(_("Supplier Details are already approved."))

		# Create standard ERPNext Supplier doc
		supplier_name_exists = frappe.db.exists("Supplier", {"supplier_name": self.supplier_name})
		if supplier_name_exists:
			frappe.throw(_("Supplier with name {0} already exists.").format(self.supplier_name))

		# Create Supplier
		supplier = frappe.get_doc({
			"doctype": "Supplier",
			"supplier_name": self.supplier_name,
			"supplier_type": self.supplier_type or "Company",
			"supplier_group": self.supplier_group or "All Supplier Groups",
			"pan": self.tax_id,
			"portal_users": [{"user": self.email_address}]
		})
		supplier.insert(ignore_permissions=True)

		# Create Address and link it to Supplier
		if self.address_line1:
			address = frappe.get_doc({
				"doctype": "Address",
				"address_title": self.supplier_name,
				"address_type": "Billing",
				"address_line1": self.address_line1,
				"address_line2": self.address_line2 or "",
				"city": self.city or "",
				"state": self.state or "",
				"country": self.country or "India",
				"pincode": self.pincode or "",
				"links": [{"link_doctype": "Supplier", "link_name": supplier.name}]
			})
			address.insert(ignore_permissions=True)

		# Create Contact and link it to Supplier
		if self.contact_no:
			contact = frappe.get_doc({
				"doctype": "Contact",
				"first_name": self.supplier_name,
				"email_id": self.email_address,
				"mobile_no": self.contact_no,
				"links": [{"link_doctype": "Supplier", "link_name": supplier.name}]
			})
			contact.insert(ignore_permissions=True)

		# Ensure the user is enabled
		if self.user:
			frappe.db.set_value("User", self.user, "enabled", 1)

		# Send notification email
		try:
			subject = _("Supplier Account Approved")
			message = _("Dear {0},<br><br>Your supplier registration request has been approved by the administrator. You can now login to the portal.<br><br>Regards,<br>Administrator").format(self.supplier_name or self.email_address)
			frappe.sendmail(recipients=[self.email_address], subject=subject, message=message)
		except Exception as e:
			frappe.log_error(message=frappe.get_traceback(), title="Supplier Approval Email Error")

		# Delete this staging record since it is now converted into standard records
		frappe.delete_doc("Supplier Details", self.name, force=True)
		frappe.db.commit()

		return "Approved"

	@frappe.whitelist()
	def reject(self):
		if "System Manager" not in frappe.get_roles():
			frappe.throw(_("Not authorized to reject supplier."), frappe.PermissionError)

		self.status = "Rejected"
		
		# Disable the linked user
		if self.user:
			frappe.db.set_value("User", self.user, "enabled", 0)

		self.save(ignore_permissions=True)
		frappe.db.commit()
		return self.status

	@frappe.whitelist()
	def suspend(self):
		if "System Manager" not in frappe.get_roles():
			frappe.throw(_("Not authorized to suspend supplier."), frappe.PermissionError)

		self.status = "Suspended"

		# Disable the linked user
		if self.user:
			frappe.db.set_value("User", self.user, "enabled", 0)

		self.save(ignore_permissions=True)
		frappe.db.commit()
		return self.status
