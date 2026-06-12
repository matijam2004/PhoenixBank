import { useState } from "react";
import { useNavigate } from "react-router-dom";

// hooks
import { useUser } from "../hooks/auth";
import { useScheduledPaymentsByCustomer, useUpdateScheduledPayment, useCreateScheduledPayment, useDeleteScheduledPayment } from "../hooks/scheduled_payments";
import { useAccounts } from "../hooks/accounts";

// CSS, js, and utils imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/scheduled-payment-page.css";
import { formatDateTime, daySuffix, to_utc, to_local } from "../utils/dates";
import { capitalize, maskId } from "../utils/strings";
import { to_$ } from "../utils/numbers";
import { INACTIVE_STATUS } from "../utils/accounts";

// component imports
import LoadingIcon from "../components/LoadingIcon";
import FailedMsg from "../components/FailedMsg";

export default function ScheduledPaymentsPage() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: scheduled_payments = [], isLoading: spLoading, error: spError } = useScheduledPaymentsByCustomer(user?._id);
  const { data: accounts = [], isLoading: accLoading, error: accError } = useAccounts();

  const [updateForm, setUpdateForm] = useState({
    _id: "",
    label: "",
    amount: "",
    frequency: "monthly",
    date: "",
    account_id: "",
    customer_id: "",
    payee: {
      name: "",
      account_id: "",
      routing_no: "",
    },
  });

  const accountClick = (account_id) => {
    navigate(`/accounts/${account_id}`, { state: { user } });
  };

  const formatFrequency = (frequency, date) => {
    if (frequency === "once") return `On ${formatDateTime(date)}`;

    if (frequency === "daily") return `Daily at ${formatDateTime(date, "t")}`;

    if (frequency === "weekly") return `Weekly on ${formatDateTime(date, "wd")}`;

    if (frequency === "monthly") {
      return `Monthly on the ${daySuffix(formatDateTime(date, "d"))}`;
    }

    return `Yearly on ${formatDateTime(date, "dt")}`;
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const useUpdate = useUpdateScheduledPayment(user?._id);
  const useCreate = useCreateScheduledPayment(user?._id);
  const useDelete = useDeleteScheduledPayment(user?._id);

  const onUpdateFormChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
  };

  const setUpdateModal = async (s) => {
    setUpdateForm({
      _id: s._id,
      label: s.label || "",
      amount: s.amount,
      frequency: s.frequency,
      date: to_local(s.date), // convert for datetime-local
      account_id: s.account_id,
      customer_id: s.customer_id,
      payee: {
        name: s.payee?.name,
        account_id: s.payee?.account_id,
        routing_no: s.payee?.routing_no,
      },
    });

    setShowUpdateModal(true);
    console.log("Editing scheduled payment:", s);
  };

  const handleCreate = async (e) => {
    const form = e.target.closest("form");

    if (!form.checkValidity()) {
      form.reportValidity();
      e.preventDefault();
      return;
    }

    e.preventDefault();
    setProcessing(true);

    try {
      const form = document.querySelector("#createForm");
      const formData = new FormData(form);
      const payload = {};
      const payee = {};

      const payee_info = ["account_id", "routing_no", "name"];

      for (const [name, value] of formData.entries()) {
        if (name === "date") continue;

        payee_info.includes(name) ? (payee[name] = value) : (payload[name] = value);
      }

      payload["date"] = to_utc(formData.get("date"));
      payload["payee"] = payee;
      payload["account_id"] = payload["from_account_id"];
      payload["customer_id"] = user._id;

      delete payload["from_account_id"];

      useCreate.mutate({ payload: payload });

      setShowCreateModal(false);
    } catch (err) {
      alert(err.message || "Error creating scheduled payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (e) => {
    const form = e.target.closest("form");

    if (!form.checkValidity()) {
      form.reportValidity();
      e.preventDefault();
      return;
    }

    e.preventDefault();
    setProcessing(true);

    try {
      const doc_id = updateForm._id;

      const payload = {
        label: updateForm.label.trim(),
        amount: updateForm.amount,
        frequency: updateForm.frequency,
        date: to_utc(updateForm.date),
        account_id: updateForm.account_id,
        customer_id: updateForm.customer_id,
        payee: {
          name: updateForm.payee.name,
          account_id: updateForm.payee.account_id,
          routing_no: updateForm.payee.routing_no,
        },
      };

      useUpdate.mutate({ id: doc_id, payload: payload });

      setShowUpdateModal(false);
    } catch (err) {
      alert(err.message || "Error creating scheduled payment.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleStatus = async (e, sp) => {
    e.preventDefault();
    setProcessing(true);

    const newStatus = sp.status === "active" ? "paused" : "active";
    console.log("new status:", newStatus);

    try {
      useUpdate.mutate({ id: sp._id, payload: { status: newStatus } });
    } catch (err) {
      alert(err.message || "Error updating scheduled payment status.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    setProcessing(true);

    try {
      useDelete.mutate({ id });
    } catch (err) {
      alert(err.message || "Error deleting scheduled payment.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="container scheduled-payment-page" data-bs-theme="dark">
        <h1 className="page-title">Scheduled Payments</h1>
        <div className="component cards">
          <div className="card text-white add-button" onClick={() => setShowCreateModal(true)}>
            <i className="bi bi-plus-circle-fill"></i>
            <span className="text-gray">Add new scheduled payment</span>
          </div>
          {spLoading ? (
            <LoadingIcon />
          ) : spError ? (
            <FailedMsg message={"Error loading scheduled payments."} />
          ) : scheduled_payments.length === 0 ? (
            <div className="card-empty">
              <span className="text-gray text-center">You have no scheduled payments.</span>
              <span className="text-gray text-center">
                <i className="bi bi-arrow-left"></i> Start by adding one
              </span>
            </div>
          ) : (
            scheduled_payments.map((s) => (
              <>
                <div key={s._id} className="card text-white">
                  <h3 className="text-truncate entry-label">{s.label}</h3>
                  <h2 className="amount">{to_$(s.amount)}</h2>
                  <span className="frequency text-gray">{formatFrequency(s.frequency, s.date)}</span>
                  <span className={`status rounded-pill ${s.status}`}>{s.status}</span>
                  <span className="info">
                    <span className="label">From</span>
                    <span className="account" onClick={() => accountClick(s.account_id)}>
                      {maskId(s.account_id)}
                    </span>
                  </span>
                  <span className="payee info">
                    <span className="label to">To</span>
                    <span className="label acc">Account ID</span>
                    <span className="label rout">Routing No.</span>
                    <span className="name">{s.payee.name}</span>
                    <span className="account_id">{s.payee.account_id}</span>
                    <span className="routing_no">{s.payee.routing_no}</span>
                  </span>
                  {s.last_run && s.frequency != "once" && (
                    <span className="info">
                      <span className="label">Next</span>
                      {/* {s.next_run ? formatDateTime(s.next_run, "dt") : "Completed"} */}
                      {formatDateTime(s.next_run, "dt")}
                    </span>
                  )}

                  {s.last_run && (
                    <span className="info">
                      <span className="label">Processed</span>
                      {formatDateTime(s.last_run, "dt")}
                    </span>
                  )}

                  <div className="dropdown controls" key={`dropdown-${s._id}`}>
                    <button className="btn btn-plain dropdown-toggle" id={`dropdownMenu-${s._id}`} title="Scheduled payment options" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i className="bi bi-three-dots"></i>
                    </button>
                    <ul className="dropdown-menu" aria-labelledby={`dropdownMenu-${s._id}`}>
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => setUpdateModal(s)}>
                          <i className="bi bi-pencil-fill"></i>
                          Edit
                        </button>
                      </li>
                      <li>
                        <button className={`dropdown-item ${s.status === "paused" ? `text-success` : `text-warning`}`} type="button" onClick={(e) => toggleStatus(e, s)}>
                          {s.status === "paused" ? <i className="bi bi-play-circle-fill"></i> : <i className="bi bi-pause-circle-fill"></i>}
                          {s.status === "paused" ? "Activate" : "Pause"}
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item text-danger" type="button" onClick={(e) => handleDelete(e, s._id)}>
                          <i className="bi bi-trash"></i>
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div
          className={`modal fade show`}
          tabIndex="-1"
          role="dialog"
          style={{
            display: "block",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={() => setShowCreateModal(false)}
          data-bs-theme="dark"
        >
          <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create new scheduled payment</h5>
                <button type="button" className="btn btn-plain close text-danger" onClick={() => setShowCreateModal(false)}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="card create-form">
                  <form className="camo-form" id="createForm" onSubmit={handleCreate}>
                    <input className="form-control" name="label" type="text" placeholder="Label (optional)" />
                    <input className="form-control" name="amount" type="number" min={0.01} step={0.01} placeholder="Amount" required />

                    <select className="form-select" name="frequency" required>
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual (Yearly)</option>
                    </select>

                    <input className="form-control" name="date" type="datetime-local" required />

                    <select className="form-select" name="from_account_id" required>
                      {accounts?.map((a) => (
                        <option key={a._id} value={a._id} disabled={INACTIVE_STATUS.includes(a.status)}>
                          {capitalize(a.account_type)} ({maskId(a._id)}) - {to_$(a.balance)}
                        </option>
                      ))}
                    </select>

                    <input className="form-control" name="name" type="text" placeholder="Payee" required />
                    <input className="form-control" name="account_id" type="text" placeholder="Account ID" required />
                    <input className="form-control" name="routing_no" type="text" placeholder="Routing No." required />
                    <button type="submit" className="btn btn-success" disabled={processing}>
                      {processing ? <i className="bi spinner-grow spinner-grow-sm"></i> : <i className="bi bi-plus-circle-fill"></i>}
                      {processing ? "Processing..." : "Create"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div
          className={`modal fade show`}
          tabIndex="-1"
          role="dialog"
          style={{
            display: "block",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={() => setShowUpdateModal(false)}
          data-bs-theme="dark"
        >
          <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit scheduled payment</h5>
                <button type="button" className="btn btn-plain close text-danger" onClick={() => setShowUpdateModal(false)}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="card edit-form">
                  <form className="camo-form" id="EditForm" onSubmit={handleUpdate}>
                    <input className="form-control" name="label" value={updateForm.label} onChange={onUpdateFormChange} type="text" placeholder="Label (optional)" />
                    <input className="form-control" name="amount" value={updateForm.amount} onChange={onUpdateFormChange} type="number" min={0.01} step={0.01} placeholder="Amount" required />

                    <select className="form-select" name="frequency" value={updateForm.frequency} onChange={onUpdateFormChange} required>
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual (Yearly)</option>
                    </select>

                    <input className="form-control" name="date" value={updateForm.date} onChange={onUpdateFormChange} type="datetime-local" required />

                    <select className="form-select" name="from_account_id" value={updateForm.account_id} onChange={onUpdateFormChange} required>
                      {accounts?.map((a) => (
                        <option key={a._id} value={a._id} disabled={INACTIVE_STATUS.includes(a.status)}>
                          {capitalize(a.account_type)} ({maskId(a._id)}) - {to_$(a.balance)}
                        </option>
                      ))}
                    </select>

                    <input className="form-control" name="name" value={updateForm.payee.name} onChange={onUpdateFormChange} type="text" placeholder="To" required />
                    <input className="form-control" name="account_id" value={updateForm.payee.account_id} onChange={onUpdateFormChange} type="text" placeholder="Account ID" required />
                    <input className="form-control" name="routing_no" value={updateForm.payee.routing_no} onChange={onUpdateFormChange} type="text" placeholder="Routing No." required />
                    <button type="submit" className="btn btn-success" disabled={processing}>
                      {processing ? <i className="bi spinner-grow spinner-grow-sm"></i> : <i className="bi bi-pencil-fill"></i>}
                      {processing ? "Processing..." : "Update"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
