import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AgentChatDrawer } from './components/AgentChatDrawer';

// 12 Pages
import { ExecutiveOverview } from './pages/ExecutiveOverview';
import { InventoryManagement } from './pages/InventoryManagement';
import { DemandForecasting } from './pages/DemandForecasting';
import { AiInventoryAgent } from './pages/AiInventoryAgent';
import { ReplenishmentManagement } from './pages/ReplenishmentManagement';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { SupplierAnalytics } from './pages/SupplierAnalytics';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { AgentActivityLog } from './pages/AgentActivityLog';
import { DatasetManagement } from './pages/DatasetManagement';
import { SettingsPage } from './pages/SettingsPage';

import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTriggerAgentRun = async () => {
    setIsEvaluating(true);
    try {
      await api.runAgentCycle(false);
      setRefreshTrigger((prev) => prev + 1);
      alert('Autonomous AI Inventory Agent evaluation completed. Recommendations and risk scores updated!');
    } catch (err: any) {
      alert(`Error running agent: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Dark Navy Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAgentChat={() => setIsAgentChatOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          activeTab={activeTab}
          onOpenAgentChat={() => setIsAgentChatOpen(true)}
          onTriggerAgentRun={handleTriggerAgentRun}
          isEvaluating={isEvaluating}
        />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'overview' && (
              <ExecutiveOverview
                key={`overview-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryManagement
                key={`inventory-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
              />
            )}

            {activeTab === 'forecasting' && (
              <DemandForecasting
                key={`forecasting-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
              />
            )}

            {activeTab === 'agent' && (
              <AiInventoryAgent
                key={`agent-${refreshTrigger}`}
              />
            )}

            {activeTab === 'replenishment' && (
              <ReplenishmentManagement
                key={`replenishment-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'purchase-orders' && (
              <PurchaseOrders
                key={`po-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
              />
            )}

            {activeTab === 'suppliers' && (
              <SupplierAnalytics
                key={`suppliers-${refreshTrigger}`}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsAnalytics
                key={`reports-${refreshTrigger}`}
              />
            )}

            {activeTab === 'activity' && (
              <AgentActivityLog
                key={`activity-${refreshTrigger}`}
                onSelectProduct={(id) => setSelectedProductId(id)}
              />
            )}

            {activeTab === 'dataset' && (
              <DatasetManagement
                key={`dataset-${refreshTrigger}`}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                key={`settings-${refreshTrigger}`}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onDraftCreated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <AgentChatDrawer
        isOpen={isAgentChatOpen}
        onClose={() => setIsAgentChatOpen(false)}
      />
    </div>
  );
}

export default App;

