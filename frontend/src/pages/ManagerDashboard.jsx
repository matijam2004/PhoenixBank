import React, { useState, useEffect } from "react";
import "../styles/manager-dashboard.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { managersAPI } from "../services/api/managers";
import { reportingAPI } from "../services/api/reporting";
import { maskId, capitalize } from "../utils/strings";
import { to_$ } from "../utils/numbers";
import { getAuthToken } from "../services/api/http";
import { downloadFile } from "../utils/download";
import { useOAuthToken } from "../hooks/useOAuthToken";
import { cardApplicationsAPI } from "../services/api/card_applications";

function ManagerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("customers");

  // Data states
  const [customers, setCustomers] = useState([]);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [customerAccountMap, setCustomerAccountMap] = useState({}); // customer_id -> accounts
  const [accountToCustomerMap, setAccountToCustomerMap] = useState({}); // account_id -> customer_id

  // Card applications
  const [cardApplications, setCardApplications] = useState([]);
  const [cardAppFilter, setCardAppFilter] = useState("pending");
  const [cardAppLoading, setCardAppLoading] = useState(false);
  const [cardAppError, setCardAppError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModal, setRejectModal] = useState({ open: false, app: null, reason: "" });

  // Loading and error states
  const [loading, setLoading] = useState({
    customers: false,
    accounts: false,
    transactions: false,
    checks: false,
  });
  const [error, setError] = useState(null);
  const [balanceModal, setBalanceModal] = useState({
    open: false,
    account: null,
    amount: "",
    error: "",
  });
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);
  const [downloading, setDownloading] = useState({ csv: false, pdf: false });

  const formatErrorMessage = (err, fallback = "Something went wrong") => {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (typeof err.message === "string") return err.message;
    if (typeof err.detail === "string") return err.detail;
    if (err.detail && typeof err.detail === "object") {
      const nestedMessage = err.detail.message || err.detail.msg || err.detail.error;
      if (typeof nestedMessage === "string") return nestedMessage;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  };

  const getCustomerId = (customer) => {
    return customer?.id || customer?._id || null;
  };

  useOAuthToken();

  // Fetch all customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading((prev) => ({ ...prev, customers: true }));
      setError(null);
      try {
        const data = await managersAPI.getAllCustomers();
        setCustomers(data);
        setLoading((prev) => ({ ...prev, customers: false }));

        // Fetch accounts for each customer to calculate totals (in parallel)
        const accountMap = {};
        const accountPromises = data
          .filter((customer) => {
            // Only process customers with valid IDs
            const customerId = customer.id || customer._id;
            if (!customerId) {
              console.warn("Customer missing ID:", customer);
              return false;
            }
            return true;
          })
          .map(async (customer) => {
            const customerId = customer.id || customer._id;
            try {
              const accounts = await managersAPI.getCustomerAccounts(customerId);
              return { customerId, accounts };
            } catch (err) {
              console.error(`Failed to fetch accounts for customer ${customerId}:`, err);
              return { customerId, accounts: [] };
            }
          });

        const results = await Promise.all(accountPromises);
        const accountToCustomer = {};
        results.forEach(({ customerId, accounts }) => {
          accountMap[customerId] = accounts;
          // Create reverse mapping: account_id -> customer_id
          accounts.forEach((account) => {
            const accountId = account.id || account._id;
            accountToCustomer[accountId] = customerId;
          });
        });
        setCustomerAccountMap(accountMap);
        setAccountToCustomerMap(accountToCustomer);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setError(err.message || "Failed to load customers");
        setLoading((prev) => ({ ...prev, customers: false }));
      }
    };

    fetchCustomers();
  }, []);

  // Fetch accounts when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const fetchAccounts = async () => {
        setLoading((prev) => ({ ...prev, accounts: true }));
        setError(null);
        try {
          const customerId = getCustomerId(selectedCustomer);
          if (!customerId) {
            setError("Invalid customer: missing ID");
            setCustomerAccounts([]);
            setLoading((prev) => ({ ...prev, accounts: false }));
            return;
          }

          // Always fetch fresh accounts when user explicitly clicks "View Accounts"
          // This ensures we get the latest data, even if we have cached accounts
          const accounts = await managersAPI.getCustomerAccounts(customerId);
          // Ensure accounts is always an array
          const accountsArray = Array.isArray(accounts) ? accounts : [];

          // Set accounts state first
          setCustomerAccounts(accountsArray);

          // Update customer account map
          setCustomerAccountMap((prev) => ({
            ...prev,
            [customerId]: accountsArray,
          }));

          // Update account to customer mapping
          setAccountToCustomerMap((prev) => {
            const updated = { ...prev };
            accountsArray.forEach((account) => {
              const accountId = account.id || account._id;
              updated[accountId] = customerId;
            });
            return updated;
          });

          // Set loading to false AFTER setting the accounts
          setLoading((prev) => ({ ...prev, accounts: false }));
        } catch (err) {
          console.error("Failed to fetch accounts:", err);
          const errorMsg = err.message || "Failed to load accounts";
          setError(errorMsg);
          // Set empty array on error so UI doesn't break
          setCustomerAccounts([]);
          setLoading((prev) => ({ ...prev, accounts: false }));
        }
      };

      fetchAccounts();
    } else {
      setCustomerAccounts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]); // Only depend on selectedCustomer to avoid infinite loops

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === "transactions") {
      const fetchTransactions = async () => {
        setLoading((prev) => ({ ...prev, transactions: true }));
        setError(null);
        try {
          // Check if token exists and is valid
          const token = getAuthToken();
          if (!token) {
            setError("Not authenticated. Please log in again.");
            setLoading((prev) => ({ ...prev, transactions: false }));
            return;
          }

          // Decode token to check scope and expiration
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const isExpired = payload.exp && payload.exp * 1000 < Date.now();
            if (isExpired) {
              setError("Token expired. Please log in again.");
              setLoading((prev) => ({ ...prev, transactions: false }));
              return;
            }
            if (payload.scope !== "manager") {
              setError(`Authentication error: Token scope is "${payload.scope}", expected "manager". Please log in again.`);
              setLoading((prev) => ({ ...prev, transactions: false }));
              return;
            }
          } catch (e) {
            console.error("Error decoding token:", e);
            setError("Invalid token format. Please log in again.");
            setLoading((prev) => ({ ...prev, transactions: false }));
            return;
          }

          const data = await managersAPI.getAllTransactions({ limit: 200 });
          const transactions = data.items || data || [];
          setAllTransactions(transactions);

          // Fetch account details for any accounts we don't have in our map
          const accountIds = new Set();
          transactions.forEach((txn) => {
            if (txn.from_account_id) accountIds.add(txn.from_account_id);
            if (txn.to_account_id) accountIds.add(txn.to_account_id);
          });

          // Find accounts we don't have mapped yet
          const missingAccountIds = Array.from(accountIds).filter((accountId) => !accountToCustomerMap[accountId]);

          // Fetch account details for missing accounts
          if (missingAccountIds.length > 0) {
            const accountPromises = missingAccountIds.map(async (accountId) => {
              try {
                const account = await managersAPI.getAccount(accountId);
                return account;
              } catch (err) {
                console.error(`Failed to fetch account ${accountId}:`, err);
                return null;
              }
            });

            const fetchedAccounts = await Promise.all(accountPromises);
            const validAccounts = fetchedAccounts.filter((acc) => acc !== null);

            // Update the account to customer mapping
            setAccountToCustomerMap((prev) => {
              const updated = { ...prev };
              validAccounts.forEach((account) => {
                const accountId = account.id || account._id;
                const customerId = account.customer_id;
                if (customerId) {
                  updated[accountId] = customerId;
                }
              });
              return updated;
            });
          }
        } catch (err) {
          console.error("Failed to fetch transactions:", err);
          const errorMsg = err.message || "Failed to load transactions";
          console.error("Error details:", errorMsg);
          setError(errorMsg);
          // Set empty array on error so UI doesn't break
          setAllTransactions([]);
        } finally {
          setLoading((prev) => ({ ...prev, transactions: false }));
        }
      };

      fetchTransactions();
    }
  }, [activeTab]); // Only depend on activeTab, not accountToCustomerMap to avoid infinite loop

  // Load card applications when that tab is active
  useEffect(() => {
    if (activeTab !== "card-applications") return;
    const load = async () => {
      setCardAppLoading(true);
      setCardAppError(null);
      try {
        const data = await cardApplicationsAPI.getAll(cardAppFilter === "all" ? null : cardAppFilter);
        setCardApplications(data || []);
      } catch (err) {
        setCardAppError(err.message);
      } finally {
        setCardAppLoading(false);
      }
    };
    load();
  }, [activeTab, cardAppFilter]);

  const handleApprove = async (app) => {
    setActionLoading(p => ({ ...p, [app._id]: "approving" }));
    try {
      await cardApplicationsAPI.approve(app._id);
      setCardApplications(prev => prev.map(a => a._id === app._id ? { ...a, status: "approved" } : a));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(p => ({ ...p, [app._id]: null }));
    }
  };

  const handleReject = async () => {
    const { app, reason } = rejectModal;
    setActionLoading(p => ({ ...p, [app._id]: "rejecting" }));
    try {
      await cardApplicationsAPI.reject(app._id, reason);
      setCardApplications(prev => prev.map(a => a._id === app._id ? { ...a, status: "rejected" } : a));
      setRejectModal({ open: false, app: null, reason: "" });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(p => ({ ...p, [app._id]: null }));
    }
  };

  // Calculate customer stats
  const getCustomerStats = (customerId) => {
    if (!customerId) {
      return { accounts: 0, totalBalance: 0, status: "No Accounts" };
    }
    const accounts = customerAccountMap[customerId] || [];
    const totalBalance = accounts.reduce((sum, acc) => {
      const balance = typeof acc.balance === "string" ? parseFloat(acc.balance) : acc.balance || 0;
      return sum + balance;
    }, 0);

    // Determine status based on accounts (if any account is frozen, customer is frozen)
    const hasFrozen = accounts.some((acc) => acc.status === "frozen");
    const hasActive = accounts.some((acc) => acc.status === "active");
    const status = hasFrozen ? "Frozen" : hasActive ? "Active" : "No Accounts";

    return {
      accounts: accounts.length,
      totalBalance,
      status,
    };
  };

  // Get customer name
  const getCustomerName = (customer) => {
    return `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email;
  };

  // Get account display number
  const getAccountNumber = (account) => {
    return maskId(account.id || account._id, 4);
  };

  // Get transaction display info
  const getTransactionDisplay = (txn) => {
    // Find customer name from account
    // Try from_account_id first, then to_account_id
    const accountId = txn.from_account_id || txn.to_account_id;
    let customerName = "Unknown";
    let accountNumber = accountId ? maskId(accountId, 4) : "N/A";

    // First, try to use the account's customer_id if available (from account details)
    // Otherwise, use our mapping
    let customerId = null;

    // Check if we have account details with customer_id
    if (accountId) {
      // Try to find in accountToCustomerMap first
      customerId = accountToCustomerMap[accountId];

      // If not found, try searching through customerAccountMap
      if (!customerId) {
        for (const [cid, accounts] of Object.entries(customerAccountMap)) {
          const account = accounts.find((acc) => {
            const accId = acc.id || acc._id;
            return accId === accountId;
          });
          if (account) {
            customerId = cid;
            break;
          }
        }
      }

      // If still not found, try to use account's customer_id field directly
      // (This would require fetching account details, but let's try the mapping first)
    }

    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        customerName = getCustomerName(customer);
      }
    }

    return {
      customerName,
      accountNumber,
      merchant: txn.description || "N/A",
      date: new Date(txn.created_at).toLocaleDateString(),
      amount: parseFloat(txn.amount) * (txn.type === "deposit" || (txn.to_account_id && !txn.from_account_id) ? 1 : -1),
      status: capitalize(txn.status || "pending"),
    };
  };

  const filteredCustomers = customers.filter((customer) => {
    const customerId = getCustomerId(customer);

    // Skip customers whose accounts haven't loaded yet (prevents showing wrong data during loading)
    if (!customerAccountMap[customerId] && Object.keys(customerAccountMap).length > 0) {
      return false;
    }

    // Search query filter (name, email, ID)
    const name = getCustomerName(customer).toLowerCase();
    const email = (customer.email || "").toLowerCase();
    const id = (customerId || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || name.includes(query) || email.includes(query) || id.includes(query);

    // Zip code filter
    const customerZip = (customer.zip || "").toLowerCase();
    const matchesZip = !zipFilter || customerZip.includes(zipFilter.toLowerCase());

    // Balance filter
    const stats = getCustomerStats(customerId);
    const balance = stats.totalBalance;
    const matchesMinBalance = !minBalance || balance >= parseFloat(minBalance);
    const matchesMaxBalance = !maxBalance || balance <= parseFloat(maxBalance);

    // Status filter
    const matchesStatus = statusFilter === "all" || stats.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesZip && matchesMinBalance && matchesMaxBalance && matchesStatus;
  });

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    // Keep activeTab as "customers" since accounts view is nested within customers tab
  };

  const handleBackToCustomers = () => {
    setSelectedCustomer(null);
    setActiveTab("customers");
  };

  const handleFreezeUnfreezeCustomer = async (customer) => {
    const customerId = getCustomerId(customer);
    if (!customerId) {
      alert("Invalid customer: missing ID");
      return;
    }

    const accounts = customerAccountMap[customerId] || [];
    if (accounts.length === 0) {
      alert("Customer has no accounts to freeze/unfreeze");
      return;
    }

    const stats = getCustomerStats(customerId);
    const newStatus = stats.status === "Frozen" ? "active" : "frozen";

    try {
      // Freeze/unfreeze all accounts
      for (const account of accounts) {
        await managersAPI.updateAccount(account.id || account._id, {
          status: newStatus,
        });
      }

      // Refresh accounts
      const updatedAccounts = await managersAPI.getCustomerAccounts(customerId);
      setCustomerAccountMap((prev) => ({
        ...prev,
        [customerId]: updatedAccounts,
      }));

      // Update account to customer mapping
      setAccountToCustomerMap((prev) => {
        const updated = { ...prev };
        updatedAccounts.forEach((account) => {
          const accountId = account.id || account._id;
          updated[accountId] = customerId;
        });
        return updated;
      });

      if (getCustomerId(selectedCustomer) === customerId) {
        setCustomerAccounts(updatedAccounts);
      }

      alert(`Successfully ${newStatus === "frozen" ? "froze" : "unfroze"} all accounts for ${getCustomerName(customer)}`);
    } catch (err) {
      console.error("Failed to update account status:", err);
      alert(`Failed to ${newStatus === "frozen" ? "freeze" : "unfreeze"} accounts: ${err.message}`);
    }
  };

  const handleFreezeUnfreezeAccount = async (account) => {
    const newStatus = account.status === "frozen" ? "active" : "frozen";

    try {
      const customerId = getCustomerId(selectedCustomer);
      if (!customerId) {
        alert("Invalid customer: missing ID");
        return;
      }

      await managersAPI.updateAccount(account.id || account._id, {
        status: newStatus,
      });

      // Refresh accounts
      const updatedAccounts = await managersAPI.getCustomerAccounts(customerId);
      setCustomerAccounts(updatedAccounts);
      setCustomerAccountMap((prev) => ({
        ...prev,
        [customerId]: updatedAccounts,
      }));

      // Update account to customer mapping
      setAccountToCustomerMap((prev) => {
        const updated = { ...prev };
        updatedAccounts.forEach((acc) => {
          const accountId = acc.id || acc._id;
          updated[accountId] = customerId;
        });
        return updated;
      });

      alert(`Successfully ${newStatus === "frozen" ? "froze" : "unfroze"} account`);
    } catch (err) {
      console.error("Failed to update account status:", err);
      alert(`Failed to ${newStatus === "frozen" ? "freeze" : "unfreeze"} account: ${err.message}`);
    }
  };

  const openBalanceModal = (account) => {
    const rawBalance = typeof account.balance === "string" ? account.balance : typeof account.balance === "number" ? account.balance.toFixed(2) : (account.balance || 0).toString();

    setBalanceModal({
      open: true,
      account,
      amount: rawBalance,
      error: "",
    });
  };

  const closeBalanceModal = () => {
    setBalanceModal({
      open: false,
      account: null,
      amount: "",
      error: "",
    });
    setIsSubmittingBalance(false);
  };

  const handleModifyBalance = (account) => {
    openBalanceModal(account);
  };

  const handleBalanceAmountChange = (event) => {
    const { value } = event.target;
    setBalanceModal((prev) => ({
      ...prev,
      amount: value,
      error: "",
    }));
  };

  const submitBalanceUpdate = async (event) => {
    event.preventDefault();
    if (!balanceModal.account || isSubmittingBalance) return;

    const amount = balanceModal.amount.trim();
    if (!amount) {
      setBalanceModal((prev) => ({
        ...prev,
        error: "Please enter a balance value.",
      }));
      return;
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setBalanceModal((prev) => ({
        ...prev,
        error: "Balance must be a non-negative number.",
      }));
      return;
    }

    const customerId = getCustomerId(selectedCustomer);
    if (!customerId) {
      setBalanceModal((prev) => ({
        ...prev,
        error: "Unable to determine customer. Please reload and try again.",
      }));
      return;
    }

    setIsSubmittingBalance(true);

    try {
      const normalizedBalance = Number(parsed.toFixed(2));

      await managersAPI.updateAccount(balanceModal.account.id || balanceModal.account._id, {
        balance: normalizedBalance,
      });

      const updatedAccounts = await managersAPI.getCustomerAccounts(customerId);
      setCustomerAccounts(updatedAccounts);
      setCustomerAccountMap((prev) => ({
        ...prev,
        [customerId]: updatedAccounts,
      }));

      setAccountToCustomerMap((prev) => {
        const updated = { ...prev };
        updatedAccounts.forEach((acct) => {
          const accountId = acct.id || acct._id;
          updated[accountId] = customerId;
        });
        return updated;
      });

      closeBalanceModal();
      alert("Balance updated successfully");
    } catch (err) {
      console.error("Failed to update balance:", err);
      setBalanceModal((prev) => ({
        ...prev,
        error: formatErrorMessage(err, "Failed to update balance. Please try again."),
      }));
      setIsSubmittingBalance(false);
    }
  };

  const handleCloseAccount = async (account) => {
    if (!confirm(`Are you sure you want to close account ${getAccountNumber(account)}? This action cannot be undone.`)) {
      return;
    }

    const customerId = getCustomerId(selectedCustomer);
    if (!customerId) {
      alert("Invalid customer: missing ID");
      return;
    }

    try {
      if (account.balance > 0) {
        alert("There's still remaining balance in the account. Balance must be 0 before closing.");
        return;
      }

      await managersAPI.updateAccount(account.id || account._id, {
        status: "closed",
      });

      // Refresh accounts
      const updatedAccounts = await managersAPI.getCustomerAccounts(customerId);
      setCustomerAccounts(updatedAccounts);
      setCustomerAccountMap((prev) => ({
        ...prev,
        [customerId]: updatedAccounts,
      }));

      // Update account to customer mapping
      setAccountToCustomerMap((prev) => {
        const updated = { ...prev };
        updatedAccounts.forEach((account) => {
          const accountId = account.id || account._id;
          updated[accountId] = customerId;
        });
        return updated;
      });

      alert("Account closed successfully");
    } catch (err) {
      console.error("Failed to close account:", err);
      alert(`Failed to close account: ${err.message}`);
    }
  };

  const handleViewAccountTransactions = async (account) => {
    const accountId = account.id || account._id;
    try {
      const data = await managersAPI.getAccountTransactions(accountId);
      const transactions = Array.isArray(data) ? data : data.items || [];

      if (transactions.length === 0) {
        alert("No transactions found for this account");
        return;
      }

      // Switch to transactions tab and show account transactions
      setActiveTab("transactions");
      setAllTransactions(transactions);
    } catch (err) {
      console.error("Failed to fetch account transactions:", err);
      console.error("Error details:", err.message, err);
      alert(`Failed to load transactions: ${err.message || "Internal server error"}`);
    }
  };

  const handleCreateAccount = async () => {
    const accountType = prompt("Enter account type (checking or savings):", "checking");
    if (!accountType || !["checking", "savings"].includes(accountType.toLowerCase())) {
      alert("Please enter 'checking' or 'savings'");
      return;
    }

    const openingBalance = prompt("Enter opening balance:", "0.00");
    if (openingBalance === null) return;

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      alert("Please enter a valid positive number");
      return;
    }

    const customerId = getCustomerId(selectedCustomer);
    if (!customerId) {
      alert("Invalid customer: missing ID");
      return;
    }

    try {
      await managersAPI.createAccount({
        customer_id: customerId,
        account_type: accountType.toLowerCase(),
        opening_balance: balance.toString(),
      });

      // Refresh accounts
      const updatedAccounts = await managersAPI.getCustomerAccounts(customerId);
      setCustomerAccounts(updatedAccounts);
      setCustomerAccountMap((prev) => ({
        ...prev,
        [customerId]: updatedAccounts,
      }));

      // Update account to customer mapping
      setAccountToCustomerMap((prev) => {
        const updated = { ...prev };
        updatedAccounts.forEach((account) => {
          const accountId = account.id || account._id;
          updated[accountId] = customerId;
        });
        return updated;
      });

      alert("Account created successfully");
    } catch (err) {
      console.error("Failed to create account:", err);
      alert(`Failed to create account: ${err.message}`);
    }
  };

  const handleExportCSV = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedCustomer) {
      alert("Please select a customer first");
      return;
    }

    if (downloading.csv) return;

    const customerId = getCustomerId(selectedCustomer);
    if (!customerId) {
      alert("Invalid customer: missing ID");
      return;
    }

    console.log("Starting CSV download for customer:", customerId);
    setDownloading((prev) => ({ ...prev, csv: true }));

    try {
      console.log("Calling API for CSV download...");
      const { blob, filename } = await reportingAPI.downloadCustomerTransactions("csv", customerId);

      console.log("Received response:", {
        blobSize: blob?.size,
        blobType: blob?.type,
        filename,
      });

      if (!blob || blob.size === 0) {
        console.warn("Empty blob received");
        alert("The downloaded file is empty. This customer may not have any transactions yet.");
        setDownloading((prev) => ({ ...prev, csv: false }));
        return;
      }

      // Double-check blob type before downloading
      if (blob.type && (blob.type.includes("text/html") || blob.type.includes("application/json"))) {
        const text = await blob.text();
        console.error("Received non-CSV response:", {
          type: blob.type,
          preview: text.substring(0, 500),
        });
        alert("Server returned an error instead of CSV file. Check the browser console (F12) for details.");
        setDownloading((prev) => ({ ...prev, csv: false }));
        return;
      }

      console.log("Triggering file download...");
      downloadFile(blob, filename);
      console.log("Download initiated successfully");
    } catch (error) {
      console.error("CSV download error:", {
        message: error.message,
        stack: error.stack,
        error: error,
      });
      alert(`Failed to download CSV: ${error.message}\n\nCheck the browser console (Press F12) for more details.`);
    } finally {
      setDownloading((prev) => ({ ...prev, csv: false }));
    }
  };

  const handleExportPDF = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedCustomer) {
      alert("Please select a customer first");
      return;
    }

    if (downloading.pdf) return;

    const customerId = getCustomerId(selectedCustomer);
    if (!customerId) {
      alert("Invalid customer: missing ID");
      return;
    }

    console.log("Starting PDF download for customer:", customerId);
    setDownloading((prev) => ({ ...prev, pdf: true }));

    try {
      console.log("Calling API for PDF download...");
      const { blob, filename } = await reportingAPI.downloadCustomerTransactions("pdf", customerId);

      console.log("Received response:", {
        blobSize: blob?.size,
        blobType: blob?.type,
        filename,
      });

      if (!blob || blob.size === 0) {
        console.warn("Empty blob received");
        alert("The downloaded file is empty. This customer may not have any transactions yet.");
        setDownloading((prev) => ({ ...prev, pdf: false }));
        return;
      }

      // Double-check blob type before downloading
      if (blob.type && (blob.type.includes("text/html") || blob.type.includes("application/json"))) {
        const text = await blob.text();
        console.error("Received non-PDF response:", {
          type: blob.type,
          preview: text.substring(0, 500),
        });
        alert("Server returned an error instead of PDF file. Check the browser console (F12) for details.");
        setDownloading((prev) => ({ ...prev, pdf: false }));
        return;
      }

      console.log("Triggering file download...");
      downloadFile(blob, filename);
      console.log("Download initiated successfully");
    } catch (error) {
      console.error("PDF download error:", {
        message: error.message,
        stack: error.stack,
        error: error,
      });
      alert(`Failed to download PDF: ${error.message}\n\nCheck the browser console (Press F12) for more details.`);
    } finally {
      setDownloading((prev) => ({ ...prev, pdf: false }));
    }
  };

  return (
    <main className="md-wrap">
      <section className="md-header">
        <h1 className="md-title">Manager Dashboard</h1>
        <div className="md-tabs">
          <button
            className={`md-tab ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("customers");
              setSelectedCustomer(null);
            }}
          >
            Customers
          </button>
          <button
            className={`md-tab ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("transactions");
              setSelectedCustomer(null);
            }}
          >
            All Transactions
          </button>
          <button
            className={`md-tab ${activeTab === "card-applications" ? "active" : ""}`}
            onClick={() => { setActiveTab("card-applications"); setSelectedCustomer(null); }}
          >
            Card Applications
            {cardApplications.filter(a => a.status === "pending").length > 0 && activeTab !== "card-applications" && (
              <span style={{
                marginLeft: 6, background: "#c9a84c", color: "#000",
                borderRadius: "100px", fontSize: 10, fontWeight: 700,
                padding: "1px 7px", verticalAlign: "middle"
              }}>
                {cardApplications.filter(a => a.status === "pending").length}
              </span>
            )}
          </button>
          {selectedCustomer && (
            <div
              style={{
                marginLeft: "auto",
                padding: "0.5rem 1rem",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            >
              Viewing: {getCustomerName(selectedCustomer)}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div
          className="md-error"
          style={{
            padding: "1rem",
            background: "#fee",
            color: "#c00",
            margin: "1rem",
          }}
        >
          Error: {error}
        </div>
      )}

      {activeTab === "customers" && (
        <>
          {!selectedCustomer ? (
            <>
              <section className="md-section">
                <div className="md-section-head">
                  <h2>Customer Management</h2>
                  <div className="md-search-box">
                    <svg viewBox="0 0 24 24" className="md-search-icon" aria-hidden>
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search customers by name, email, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="md-search-input" />
                  </div>
                </div>

                {/* Filter Section */}
                <div
                  style={{
                    padding: "16px 18px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    margin: "0 0 16px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "6px",
                          color: "#f5b301",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Zip Code
                      </label>
                      <input
                        type="text"
                        placeholder="Enter zip code"
                        value={zipFilter}
                        onChange={(e) => setZipFilter(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          color: "#e9eaf0",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f5b301";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "6px",
                          color: "#f5b301",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Min Balance
                      </label>
                      <input
                        type="number"
                        placeholder="Minimum balance"
                        value={minBalance}
                        onChange={(e) => setMinBalance(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          color: "#e9eaf0",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f5b301";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "6px",
                          color: "#f5b301",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Max Balance
                      </label>
                      <input
                        type="number"
                        placeholder="Maximum balance"
                        value={maxBalance}
                        onChange={(e) => setMaxBalance(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          color: "#e9eaf0",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f5b301";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "6px",
                          color: "#f5b301",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          color: "#e9eaf0",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          height: "42px",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f5b301";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      >
                        <option value="all" style={{ background: "#10131c", color: "#e9eaf0" }}>
                          All
                        </option>
                        <option value="active" style={{ background: "#10131c", color: "#e9eaf0" }}>
                          Active
                        </option>
                        <option value="frozen" style={{ background: "#10131c", color: "#e9eaf0" }}>
                          Frozen
                        </option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setZipFilter("");
                        setMinBalance("");
                        setMaxBalance("");
                        setStatusFilter("all");
                      }}
                      className="md-btn md-btn-secondary"
                      style={{
                        height: "fit-content",
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </section>

              <section className="md-section">
                {loading.customers ? (
                  <div style={{ padding: "2rem", textAlign: "center" }}>Loading customers...</div>
                ) : (
                  <div className="md-customers-grid">
                    {filteredCustomers.map((customer) => {
                      const customerId = getCustomerId(customer);
                      const stats = getCustomerStats(customerId);
                      return (
                        <div key={customerId} className="md-card md-customer-card" onClick={() => handleCustomerSelect(customer)}>
                          <div className="md-card-header">
                            <div>
                              <h3>{getCustomerName(customer)}</h3>
                              <p className="md-muted">{customer.email}</p>
                            </div>
                            <span className={`md-pill ${stats.status === "Frozen" ? "md-pill-warning" : "md-pill-success"}`}>{stats.status}</span>
                          </div>
                          <div className="md-card-body">
                            <div className="md-info-row">
                              <span className="md-label">Customer ID</span>
                              <span className="md-value">{maskId(getCustomerId(customer), 8)}</span>
                            </div>
                            <div className="md-info-row">
                              <span className="md-label">Accounts</span>
                              <span className="md-value">{stats.accounts}</span>
                            </div>
                            <div className="md-info-row">
                              <span className="md-label">Total Balance</span>
                              <span className="md-value md-balance">{to_$(stats.totalBalance)}</span>
                            </div>
                          </div>
                          <div className="md-card-actions">
                            <button
                              className="md-btn md-btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerSelect(customer);
                              }}
                            >
                              View Accounts
                            </button>
                            <button
                              className="md-btn md-btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFreezeUnfreezeCustomer(customer);
                              }}
                            >
                              {stats.status === "Frozen" ? "Unfreeze" : "Freeze"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="md-section">
                <div className="md-section-head">
                  <button className="md-btn md-btn-ghost md-back-btn" onClick={handleBackToCustomers}>
                    <svg viewBox="0 0 24 24" className="md-ico" aria-hidden>
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Customers
                  </button>
                  <h2>
                    Accounts for {getCustomerName(selectedCustomer)} ({maskId(getCustomerId(selectedCustomer), 8)})
                  </h2>
                  <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                    <button
                      type="button"
                      className="md-btn md-btn-secondary"
                      onClick={handleExportCSV}
                      disabled={downloading.csv}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <i className="bi bi-file-earmark-spreadsheet"></i>
                      {downloading.csv ? "Downloading..." : "Export CSV"}
                    </button>
                    <button
                      type="button"
                      className="md-btn md-btn-secondary"
                      onClick={handleExportPDF}
                      disabled={downloading.pdf}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <i className="bi bi-file-earmark-pdf"></i>
                      {downloading.pdf ? "Downloading..." : "Export PDF"}
                    </button>
                  </div>
                </div>

                {loading.accounts ? (
                  <div style={{ padding: "2rem", textAlign: "center" }}>Loading accounts...</div>
                ) : (
                  <>
                    {customerAccounts.length === 0 ? (
                      <div
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "#666",
                        }}
                      >
                        <p>No accounts found for this customer.</p>
                        <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Click "Create New Account" below to create one.</p>
                      </div>
                    ) : (
                      <div className="md-accounts-list">
                        {customerAccounts.map((account, index) => (
                          <div key={account.id || account._id} className="md-card md-account-card">
                            <div className="md-card-header">
                              <div>
                                <h3>{capitalize(account.account_type || account.type)} Account</h3>
                                <p className="md-muted">Account {getAccountNumber(account)}</p>
                              </div>
                              <span className={`md-pill ${account.status === "active" ? "md-pill-success" : account.status === "frozen" ? "md-pill-warning" : "md-pill-warning"}`}>
                                {capitalize(account.status || "Unknown")}
                              </span>
                            </div>
                            <div className="md-card-body">
                              <div className="md-balance-display">
                                <span className="md-label">Current Balance</span>
                                <span className="md-value md-large-balance">{to_$(typeof account.balance === "string" ? parseFloat(account.balance) : account.balance || 0)}</span>
                              </div>
                            </div>
                            <div className="md-card-actions">
                              <button className="md-btn md-btn-primary" onClick={() => handleModifyBalance(account)}>
                                Modify Balance
                              </button>
                              <button className="md-btn md-btn-secondary" onClick={() => handleFreezeUnfreezeAccount(account)} disabled={account.status === "closed"}>
                                {account.status === "frozen" ? "Unfreeze" : "Freeze"}
                              </button>
                              <button className="md-btn md-btn-ghost" onClick={() => handleViewAccountTransactions(account)}>
                                View Transactions
                              </button>
                              <button className="md-btn md-btn-ghost" onClick={() => handleCloseAccount(account)} disabled={account.status === "closed"}>
                                Close Account
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="md-section-actions">
                      <button className="md-btn md-btn-primary" onClick={handleCreateAccount}>
                        Create New Account
                      </button>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}

      {activeTab === "transactions" && (
        <section className="md-section">
          <div className="md-section-head">
            <h2>All Transactions</h2>
            <div className="md-filter-actions">
              <button className="md-btn md-btn-secondary" onClick={handleExportCSV}>
                Export CSV
              </button>
              <button className="md-btn md-btn-secondary" onClick={handleExportPDF}>
                Export PDF
              </button>
            </div>
          </div>

          {loading.transactions ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>Loading transactions...</div>
          ) : (
            <div className="md-table">
              <div className="md-tr md-tr-head">
                <div>Customer</div>
                <div>Account</div>
                <div>Merchant</div>
                <div>Date</div>
                <div>Status</div>
                <div className="md-right">Amount</div>
              </div>
              {allTransactions.length === 0 ? (
                <div className="md-tr" style={{ padding: "2rem", textAlign: "center" }}>
                  No transactions found
                </div>
              ) : (
                allTransactions.map((txn) => {
                  const display = getTransactionDisplay(txn);
                  return (
                    <div key={txn.id || txn._id} className="md-tr">
                      <div>{display.customerName}</div>
                      <div>{display.accountNumber}</div>
                      <div>{display.merchant}</div>
                      <div>{display.date}</div>
                      <div>
                        <span className={`md-pill ${display.status === "Processing" || display.status === "Pending" ? "md-pill-warn" : ""}`}>{display.status}</span>
                      </div>
                      <div className={`md-right ${display.amount < 0 ? "md-neg" : "md-pos"}`}>{to_$(display.amount)}</div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {balanceModal.open && (
        <div className="md-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="balance-modal-title">
          <div className="md-modal">
            <div className="md-modal-header">
              <h3 id="balance-modal-title">Modify Account Balance</h3>
              <p className="md-modal-subtitle">Account {balanceModal.account ? getAccountNumber(balanceModal.account) : ""}</p>
            </div>

            {balanceModal.account && (
              <div className="md-modal-summary">
                <div>
                  <span className="md-label">Current Balance</span>
                  <span className="md-value">{to_$(typeof balanceModal.account.balance === "string" ? parseFloat(balanceModal.account.balance) : balanceModal.account.balance || 0)}</span>
                </div>
              </div>
            )}

            <form onSubmit={submitBalanceUpdate} className="md-modal-form">
              <label htmlFor="balance-input" className="md-label">
                New Balance
              </label>
              <div className="md-input-wrapper">
                <span className="md-input-prefix">$</span>
                <input
                  id="balance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="md-input"
                  value={balanceModal.amount}
                  onChange={handleBalanceAmountChange}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {balanceModal.error && <p className="md-modal-error">{balanceModal.error}</p>}

              <div className="md-modal-actions">
                <button type="button" className="md-btn md-btn-ghost" onClick={closeBalanceModal} disabled={isSubmittingBalance}>
                  Cancel
                </button>
                <button type="submit" className="md-btn md-btn-primary" disabled={isSubmittingBalance}>
                  {isSubmittingBalance ? "Updating..." : "Update Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CARD APPLICATIONS TAB ── */}
      {activeTab === "card-applications" && (
        <section className="md-section">
          <div className="md-section-header">
            <h2 className="md-section-title">Card Applications</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {["pending", "approved", "rejected", "all"].map(f => (
                <button
                  key={f}
                  className={`md-filter-btn ${cardAppFilter === f ? "active" : ""}`}
                  onClick={() => setCardAppFilter(f)}
                  style={{ textTransform: "capitalize" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {cardAppLoading && <div className="md-loading">Loading applications…</div>}
          {cardAppError && <div className="md-error">{cardAppError}</div>}

          {!cardAppLoading && cardApplications.length === 0 && (
            <div className="md-empty">No {cardAppFilter !== "all" ? cardAppFilter : ""} applications found.</div>
          )}

          {!cardAppLoading && cardApplications.length > 0 && (
            <div className="md-table">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Card</th>
                    <th>Income</th>
                    <th>Employment</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cardApplications.map(app => (
                    <tr key={app._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{app.first_name} {app.last_name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{app.city}, {app.state}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{app.card_name}</div>
                        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>{app.card_id}</div>
                      </td>
                      <td>${(app.income || 0).toLocaleString()}/yr</td>
                      <td style={{ fontSize: 13 }}>{app.employment}</td>
                      <td style={{ fontSize: 12, color: "#888" }}>
                        {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td>
                        <span className={`md-status-badge md-status-${app.status}`}>
                          {app.status}
                        </span>
                        {app.rejection_reason && (
                          <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{app.rejection_reason}</div>
                        )}
                      </td>
                      <td>
                        {app.status === "pending" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="md-action-btn md-approve-btn"
                              disabled={!!actionLoading[app._id]}
                              onClick={() => handleApprove(app)}
                            >
                              {actionLoading[app._id] === "approving" ? "…" : "Approve"}
                            </button>
                            <button
                              className="md-action-btn md-reject-btn"
                              disabled={!!actionLoading[app._id]}
                              onClick={() => setRejectModal({ open: true, app, reason: "" })}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {app.status !== "pending" && (
                          <span style={{ fontSize: 12, color: "#555" }}>
                            {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Reject reason modal */}
      {rejectModal.open && (
        <div className="md-modal-overlay" onClick={() => setRejectModal({ open: false, app: null, reason: "" })}>
          <div className="md-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Reject Application</h3>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 16px" }}>
              Rejecting <strong style={{ color: "#fff" }}>{rejectModal.app?.card_name}</strong> for{" "}
              <strong style={{ color: "#fff" }}>{rejectModal.app?.first_name} {rejectModal.app?.last_name}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#666" }}>
                Reason (optional)
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={e => setRejectModal(p => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Insufficient income, credit history…"
                rows={3}
                style={{
                  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
                  padding: "10px 14px", color: "#fff", fontSize: 14, resize: "vertical",
                  fontFamily: "inherit", outline: "none"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="md-action-btn"
                onClick={() => setRejectModal({ open: false, app: null, reason: "" })}
                style={{ background: "transparent", border: "1px solid #333", color: "#888" }}
              >
                Cancel
              </button>
              <button className="md-action-btn md-reject-btn" onClick={handleReject}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ManagerDashboard;
