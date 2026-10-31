"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shield,
  Trash2,
  Calendar,
  AlertCircle,
  Tag,
  UserCheck,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type Tab = "catalog" | "my-tools" | "my-requests" | "incoming-requests" | "admin-all-loans";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("catalog");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [borrowModalTool, setBorrowModalTool] = useState<{ id: Id<"tools">; name: string } | null>(null);

  // Form states
  const [toolName, setToolName] = useState("");
  const [toolCategory, setToolCategory] = useState<"power tools" | "garden" | "kitchen" | "camping" | "other">("power tools");
  const [toolCondition, setToolCondition] = useState<"new" | "like new" | "good" | "fair">("good");
  const [toolDescription, setToolDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Convex Queries
  const currentUser = useQuery(api.users.getCurrentUser);
  const allTools = useQuery(api.tools.listAllTools, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });
  const myTools = useQuery(api.tools.getMyTools);
  const myRequests = useQuery(api.requests.getMyRequests);
  const incomingRequests = useQuery(api.requests.getIncomingRequests);
  const allLoans = useQuery(api.requests.getAllLoans);

  // Convex Mutations
  const createTool = useMutation(api.tools.createTool);
  const deleteTool = useMutation(api.tools.deleteTool);
  const createBorrowRequest = useMutation(api.requests.createBorrowRequest);
  const updateRequestStatus = useMutation(api.requests.updateRequestStatus);
  const markLoanReturned = useMutation(api.requests.markLoanReturned);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (!isLoaded) {
    return <div className="py-20 text-center text-slate-400">Loading user session…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Sign in required</h2>
        <p className="text-sm text-slate-500">Please sign in via Clerk to access your LendLoop neighborhood dashboard.</p>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) return;

    await createTool({
      name: toolName,
      category: toolCategory,
      condition: toolCondition,
      description: toolDescription,
    });

    setToolName("");
    setToolDescription("");
    setIsAddToolOpen(false);
  };

  const handleBorrowRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowModalTool || !startDate || !endDate) return;

    await createBorrowRequest({
      toolId: borrowModalTool.id,
      startDate,
      endDate,
    });

    setBorrowModalTool(null);
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Neighborhood Dashboard</h1>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            {currentUser?.isTrustedLender && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Trusted Lender
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Signed in as {user.fullName || user.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        <button
          onClick={() => setIsAddToolOpen(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          List a New Tool
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "catalog"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Browse All Tools
        </button>
        <button
          onClick={() => setActiveTab("my-tools")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "my-tools"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          My Listings ({myTools?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("my-requests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "my-requests"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          My Requests ({myRequests?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("incoming-requests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "incoming-requests"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Incoming Requests ({incomingRequests?.length ?? 0})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin-all-loans")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap text-purple-700 ${
              activeTab === "admin-all-loans"
                ? "border-purple-600 font-semibold"
                : "border-transparent opacity-75 hover:opacity-100"
            }`}
          >
            All Loans (Admin)
          </button>
        )}
      </div>

      {/* TAB 1: ALL TOOLS (CATALOG) */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {["all", "power tools", "garden", "kitchen", "camping", "other"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTools?.map((tool) => (
              <div
                key={tool._id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                      {tool.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        tool.isAvailable ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {tool.isAvailable ? "Available" : "Borrowed"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{tool.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{tool.description}</p>
                  <p className="text-[11px] text-slate-400">Condition: <span className="capitalize">{tool.condition}</span></p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  {tool.ownerId === user.id ? (
                    <span className="text-xs font-medium text-slate-400">Your tool</span>
                  ) : tool.isAvailable ? (
                    <button
                      onClick={() => setBorrowModalTool({ id: tool._id, name: tool.name })}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Request to Borrow
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Currently out on loan</span>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => deleteTool({ toolId: tool._id })}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Admin Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY TOOLS */}
      {activeTab === "my-tools" && (
        <div className="space-y-4">
          {myTools?.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500">You haven’t listed any tools yet.</p>
              <button
                onClick={() => setIsAddToolOpen(true)}
                className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
              >
                Add Your First Tool
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTools?.map((tool) => (
                <div key={tool._id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                        {tool.category}
                      </span>
                      <h3 className="font-bold text-slate-900 mt-1">{tool.name}</h3>
                    </div>
                    <button
                      onClick={() => deleteTool({ toolId: tool._id })}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Remove Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{tool.description}</p>
                  <div className="text-xs flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-400">Status</span>
                    <span className={tool.isAvailable ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                      {tool.isAvailable ? "Available" : "On Loan"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY REQUESTS (Outbound) */}
      {activeTab === "my-requests" && (
        <div className="space-y-4">
          {myRequests?.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-sm text-slate-500">
              You haven't requested any tools yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests?.map((req) => (
                <div key={req._id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{req.toolName}</h4>
                    <p className="text-xs text-slate-500">
                      Dates: {req.startDate} to {req.endDate}
                    </p>
                    {req.reminderCount && req.reminderCount > 0 ? (
                      <p className="text-[11px] text-amber-600 font-medium">
                        n8n automation: {req.reminderCount} return reminder(s) dispatched
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        req.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : req.status === "pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : req.status === "returned"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {req.status}
                    </span>

                    {req.status === "approved" && (
                      <button
                        onClick={() => markLoanReturned({ requestId: req._id })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Mark Returned
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INCOMING REQUESTS */}
      {activeTab === "incoming-requests" && (
        <div className="space-y-4">
          {incomingRequests?.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-sm text-slate-500">
              No pending borrow requests for your tools.
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests?.map((req) => (
                <div key={req._id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{req.toolName}</h4>
                    <p className="text-xs text-slate-500">
                      Requested by: <span className="font-medium text-slate-700">{req.borrowerName}</span> ({req.startDate} to {req.endDate})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "pending" ? (
                      <>
                        <button
                          onClick={() => updateRequestStatus({ requestId: req._id, newStatus: "approved" })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateRequestStatus({ requestId: req._id, newStatus: "declined" })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 uppercase">{req.status}</span>
                    )}

                    {req.status === "approved" && (
                      <button
                        onClick={() => markLoanReturned({ requestId: req._id })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Mark Returned
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMIN ALL LOANS */}
      {isAdmin && activeTab === "admin-all-loans" && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-xs text-purple-800">
            <strong>Admin View:</strong> You have system-wide oversight to review all neighborhood loans, enforce returns, or remove spam listings.
          </div>

          <div className="space-y-2">
            {allLoans?.map((loan) => (
              <div key={loan._id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900">{loan.toolName}</span> · {loan.startDate} to {loan.endDate}
                  <div className="text-slate-400 mt-0.5">Borrower ID: {loan.borrowerId} · Owner ID: {loan.ownerId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                    {loan.status}
                  </span>
                  {loan.status === "approved" && (
                    <button
                      onClick={() => markLoanReturned({ requestId: loan._id })}
                      className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px]"
                    >
                      Force Return
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD TOOL */}
      {isAddToolOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">List a Tool for Neighbors</h2>
            <form onSubmit={handleCreateTool} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Tool Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DeWalt Cordless Drill"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={toolCategory}
                    onChange={(e: any) => setToolCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="power tools">Power Tools</option>
                    <option value="garden">Garden</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="camping">Camping</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Condition</label>
                  <select
                    value={toolCondition}
                    onChange={(e: any) => setToolCondition(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="new">New</option>
                    <option value="like new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Short Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Include accessories, battery type, or usage notes..."
                  value={toolDescription}
                  onChange={(e) => setToolDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddToolOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BORROW REQUEST */}
      {borrowModalTool && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">Request {borrowModalTool.name}</h2>
            <form onSubmit={handleBorrowRequest} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowModalTool(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
