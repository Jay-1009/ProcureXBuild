// Copyright (c) 2026, Quantbit Technologies Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on('Supplier Details', {
	refresh: function(frm) {
		if (frm.doc.status === 'Pending Approval' || frm.doc.status === 'Draft') {
			frm.add_custom_button(__('Approve'), function() {
				frappe.confirm(__('Are you sure you want to approve this supplier? This will create a standard Supplier, Address, and Contact record.'), function() {
					frm.call('approve').then(r => {
						frappe.show_alert({message: __('Supplier approved successfully'), indicator: 'green'});
						frm.reload_doc();
					});
				});
			}).addClass('btn-primary');

			frm.add_custom_button(__('Reject'), function() {
				frappe.confirm(__('Are you sure you want to reject this supplier? This will disable their login.'), function() {
					frm.call('reject').then(r => {
						frappe.show_alert({message: __('Supplier rejected'), indicator: 'red'});
						frm.reload_doc();
					});
				});
			}).addClass('btn-danger');
		}

		if (frm.doc.status === 'Approved') {
			frm.add_custom_button(__('Suspend'), function() {
				frappe.confirm(__('Are you sure you want to suspend this supplier? This will disable their login.'), function() {
					frm.call('suspend').then(r => {
						frappe.show_alert({message: __('Supplier suspended'), indicator: 'orange'});
						frm.reload_doc();
					});
				});
			}).addClass('btn-danger');
		}
	}
});
