"use client";

import * as React from "react";

type WidgetTab = "conversations" | "notifications" | "jobs";

export function MessagingWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<WidgetTab>("conversations");

  return (
    <div className="fixed bottom-0 right-4 z-50 flex flex-col">
      {/* Widget header (always visible) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-t-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary/90"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Messages</span>
        {!isOpen && (
          <svg
            className="ml-1 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        )}
        {isOpen && (
          <svg
            className="ml-1 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {/* Widget content (slides up/down) */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="w-80 bg-white shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("conversations")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "conversations"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "notifications"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "jobs"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Emplois
            </button>
          </div>

          {/* Content area */}
          <div className="h-100 overflow-y-auto">
            {activeTab === "conversations" && (
              <ConversationsTab />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab />
            )}
            {activeTab === "jobs" && (
              <JobsTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationsTab() {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-muted">
        <svg
          className="mx-auto mb-3 h-12 w-12 opacity-30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="font-medium">Aucune conversation</p>
        <p className="mt-1 text-xs">
          Vos conversations avec les professionnels apparaîtront ici
        </p>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-muted">
        <svg
          className="mx-auto mb-3 h-12 w-12 opacity-30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <p className="font-medium">Aucune notification</p>
        <p className="mt-1 text-xs">
          Vous serez notifié des mises à jour importantes
        </p>
      </div>
    </div>
  );
}

function JobsTab() {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-muted">
        <svg
          className="mx-auto mb-3 h-12 w-12 opacity-30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <p className="font-medium">Aucune offre d’emploi</p>
        <p className="mt-1 text-xs">
          Les offres d’emploi pertinentes apparaîtront ici
        </p>
      </div>
    </div>
  );
}
